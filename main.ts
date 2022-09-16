import {
	MarkdownView,
	Plugin
} from 'obsidian';

import {
	EditorState,
	Transaction
} from "@codemirror/state";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const he = require("he");

export default class HTMLEntityPlugin extends Plugin {
	prefixCharacter = "&"
	suffixCharacter = ";"

	async onload() {
		// Register editorExtension to catch changes to the document
		this.registerEditorExtension([
			EditorState.transactionFilter.of(this.handleTransaction.bind(this))
		]);
	}

	handleTransaction(transaction: Transaction): Transaction {
		// Ignore transactions which don't change the document
		if (!transaction.isUserEvent("input.type") || !transaction.docChanged) {
			return transaction;
		}

		let tryReplace = false;

		transaction.changes.iterChanges(
			(fA, tA, fB, tB, inserted) => {
				if (inserted.line(1).text[0] === this.suffixCharacter) {
					tryReplace = true;
				}
			}, false)

		if (tryReplace) {
			this.decodeEntity();
		}

		return transaction;
	}

	decodeEntity() {
		setTimeout(() => {
			const editor = this.app.workspace.getActiveViewOfType(MarkdownView)?.editor;

			// If we couldn't get the active editor, return
			if (!editor) {
				return;
			}

			const cursor = editor.getCursor();
			const text = editor.getLine(cursor.line);
			const startIndex = text.lastIndexOf(this.prefixCharacter, cursor.ch);
			const endIndex = text.indexOf(this.suffixCharacter, startIndex + 1);

			// If we couldn't find the prefix or the suffix, or if the last character isn't part of the entity, exit out
			if (startIndex === -1 || endIndex === -1 || endIndex + 1 < cursor.ch) {
				return;
			}

			const entityText = text.substring(startIndex, endIndex + 1);

			const decodedText = he.decode(entityText);

			// If the decoded text is the same, don't do anything
			if (entityText === decodedText) {
				return;
			}

			// Then, replace the text
			editor.replaceRange(decodedText,
				{line: cursor.line, ch: startIndex},
				{line: cursor.line, ch: endIndex + 1}
			);

		}, 0)
	}

	onunload() {

	}
}
