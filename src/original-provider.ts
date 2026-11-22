import * as vscode from "vscode";

export class OriginalProvider implements vscode.TextDocumentContentProvider {
  static readonly scheme = "zmwatch";

  private readonly contents = new Map<string, string>();

  set(uri: vscode.Uri, content: string): void {
    this.contents.set(uri.toString(), content);
  }

  provideTextDocumentContent(uri: vscode.Uri): string {
    return this.contents.get(uri.toString()) ?? "";
  }
}
