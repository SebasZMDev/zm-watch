import * as vscode from "vscode";
import * as path from "node:path";
import { SnapshotStore } from "./core/snapshot-store";
import { shouldIgnore } from "./core/ignore";
import { Debouncer } from "./core/debouncer";
import { RateLimiter } from "./core/rate-limiter";
import { TabOrder } from "./core/tab-order";
import { OriginalProvider } from "./original-provider";

const MAX_FILE_BYTES = 1024 * 1024;
const MAX_DIFFS_PER_SECOND = 5;

let debouncer: Debouncer | undefined;

function isText(bytes: Uint8Array): boolean {
  return bytes.byteLength <= MAX_FILE_BYTES && !bytes.includes(0);
}

export function activate(context: vscode.ExtensionContext): void {
  const store = new SnapshotStore();
  const provider = new OriginalProvider();
  const config = () => vscode.workspace.getConfiguration("zmWatch");
  let ignore = config().get<string[]>("ignore", []);
  let version = 0;
  const limiter = new RateLimiter(MAX_DIFFS_PER_SECOND, 1000);
  const order = new TabOrder();
  const savedByEditor = new Map<string, number>();
  let skipped = 0;
  let skippedTimer: ReturnType<typeof setTimeout> | undefined;
  let refreshStatus = () => {};

  const diffTabs = () =>
    vscode.window.tabGroups.all
      .flatMap((g) => g.tabs)
      .filter(
        (t) =>
          t.input instanceof vscode.TabInputTextDiff &&
          t.input.original.scheme === OriginalProvider.scheme,
      );

  const closeDiffTab = async (fsPath: string) => {
    const tabs = diffTabs().filter(
      (t) => (t.input as vscode.TabInputTextDiff).modified.fsPath === fsPath,
    );
    if (tabs.length > 0) {
      await vscode.window.tabGroups.close(tabs);
    }
  };

  context.subscriptions.push(
    vscode.workspace.registerTextDocumentContentProvider(OriginalProvider.scheme, provider),
  );

  const readText = async (uri: vscode.Uri): Promise<string | undefined> => {
    try {
      const bytes = await vscode.workspace.fs.readFile(uri);
      return isText(bytes) ? Buffer.from(bytes).toString("utf8") : undefined;
    } catch {
      return undefined;
    }
  };

  const prime = async () => {
    const exclude = ignore.length > 0 ? `**/{${ignore.join(",")}}/**` : undefined;
    const files = await vscode.workspace.findFiles("**/*", exclude, 2000);
    for (const uri of files) {
      const text = await readText(uri);
      if (text !== undefined) {
        store.set(uri.fsPath, text);
      }
    }
  };
  void prime();

  const noteSkipped = () => {
    skipped++;
    refreshStatus();
    clearTimeout(skippedTimer);
    skippedTimer = setTimeout(() => {
      skipped = 0;
      refreshStatus();
    }, 10000);
  };

  const handleChange = async (fsPath: string) => {
    const uri = vscode.Uri.file(fsPath);
    const next = await readText(uri);
    if (next === undefined) {
      return;
    }
    const prev = store.get(fsPath) ?? "";
    if (prev === next) {
      return;
    }
    store.set(fsPath, next);
    if (!config().get<boolean>("enabled", true)) {
      return;
    }
    const savedAt = savedByEditor.get(fsPath);
    savedByEditor.delete(fsPath);
    if (
      config().get<boolean>("ignoreEditorSaves", true) &&
      savedAt !== undefined &&
      Date.now() - savedAt < 2000
    ) {
      return;
    }
    if (!limiter.tryAcquire(Date.now())) {
      noteSkipped();
      return;
    }
    const name = path.basename(fsPath);
    const left = vscode.Uri.from({
      scheme: OriginalProvider.scheme,
      path: uri.path,
      query: `v=${++version}`,
    });
    provider.set(left, prev);
    await closeDiffTab(fsPath);
    await vscode.commands.executeCommand(
      "vscode.diff",
      left,
      uri,
      `ZM Watch: ${name} (antes ↔ ahora)`,
      { preview: false, preserveFocus: true },
    );
    order.touch(fsPath);
    order.prune(new Set(diffTabs().map((t) => (t.input as vscode.TabInputTextDiff).modified.fsPath)));
    const max = Math.max(1, config().get<number>("maxTabs", 8));
    for (const old of order.overflow(max)) {
      await closeDiffTab(old);
    }
  };

  debouncer = new Debouncer(300, (fsPath) => {
    void handleChange(fsPath).catch(() => undefined);
  });

  const watcher = vscode.workspace.createFileSystemWatcher("**/*");
  const onEvent = (uri: vscode.Uri) => {
    if (shouldIgnore(vscode.workspace.asRelativePath(uri), ignore)) {
      return;
    }
    debouncer?.push(uri.fsPath);
  };
  context.subscriptions.push(
    watcher,
    watcher.onDidChange(onEvent),
    watcher.onDidCreate(onEvent),
    watcher.onDidDelete((uri) => store.delete(uri.fsPath)),
    vscode.workspace.onDidSaveTextDocument((doc) => savedByEditor.set(doc.uri.fsPath, Date.now())),
    { dispose: () => { debouncer?.dispose(); clearTimeout(skippedTimer); } },
  );

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = "zmWatch.toggle";
  refreshStatus = () => {
    const on = config().get<boolean>("enabled", true);
    const extra = skipped > 0 ? ` +${skipped}` : "";
    statusBar.text = (on ? "$(eye) ZM Watch" : "$(eye-closed) ZM Watch") + extra;
    statusBar.tooltip =
      (on ? "ZM Watch activo: clic para desactivar" : "ZM Watch desactivado: clic para activar") +
      (skipped > 0 ? `
${skipped} cambios sin mostrar (demasiados por segundo)` : "");
  };
  refreshStatus();
  statusBar.show();
  context.subscriptions.push(
    statusBar,
    vscode.commands.registerCommand("zmWatch.toggle", async () => {
      const next = !config().get<boolean>("enabled", true);
      await config().update("enabled", next, vscode.ConfigurationTarget.Global);
    }),
    vscode.workspace.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration("zmWatch")) {
        ignore = config().get<string[]>("ignore", []);
        refreshStatus();
      }
    }),
  );
}

export function deactivate(): void {
  debouncer?.dispose();
  debouncer = undefined;
}
