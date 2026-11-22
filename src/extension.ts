import * as vscode from "vscode";
import * as path from "node:path";
import { SnapshotStore } from "./core/snapshot-store";
import { shouldIgnore } from "./core/ignore";
import { Debouncer } from "./core/debouncer";
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
  let recentDiffs: number[] = [];
  const order: string[] = [];

  const closeDiffTab = async (fsPath: string) => {
    const tabs = vscode.window.tabGroups.all
      .flatMap((g) => g.tabs)
      .filter(
        (t) =>
          t.input instanceof vscode.TabInputTextDiff &&
          t.input.original.scheme === OriginalProvider.scheme &&
          t.input.modified.fsPath === fsPath,
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

  const canOpenDiff = (): boolean => {
    const now = Date.now();
    recentDiffs = recentDiffs.filter((t) => now - t < 1000);
    if (recentDiffs.length >= MAX_DIFFS_PER_SECOND) {
      return false;
    }
    recentDiffs.push(now);
    return true;
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
    if (!config().get<boolean>("enabled", true) || !canOpenDiff()) {
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
    const at = order.indexOf(fsPath);
    if (at >= 0) {
      order.splice(at, 1);
    }
    order.push(fsPath);
    await vscode.commands.executeCommand(
      "vscode.diff",
      left,
      uri,
      `ZM Watch: ${name} (antes ↔ ahora)`,
      { preview: false, preserveFocus: true },
    );
    const max = Math.max(1, config().get<number>("maxTabs", 8));
    while (order.length > max) {
      await closeDiffTab(order.shift() as string);
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
    { dispose: () => debouncer?.dispose() },
  );

  const statusBar = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100);
  statusBar.command = "zmWatch.toggle";
  const refreshStatus = () => {
    const on = config().get<boolean>("enabled", true);
    statusBar.text = on ? "$(eye) ZM Watch" : "$(eye-closed) ZM Watch";
    statusBar.tooltip = on
      ? "ZM Watch activo: clic para desactivar"
      : "ZM Watch desactivado: clic para activar";
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
