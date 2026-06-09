'use client';

/**
 * `@`-mention feature: type `@` in any slide rich-text field to insert a
 * dynamic variable token like `{org.name}` or `{title}`. The token is PLAIN
 * TEXT — it is resolved at build time by resolveVars (src/export/vars.ts), so
 * no custom Lexical node or HTML converter is needed here.
 *
 * The variable list is fetched per-document from GET /api/presentations/:id/vars
 * (the populated doc + its linked org), so any field on either collection shows
 * up automatically (SSOT). Unsaved docs have no id → empty menu, no error.
 */

import { useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';

import { createClientFeature } from '@payloadcms/richtext-lexical/client';
import { useLexicalComposerContext } from '@payloadcms/richtext-lexical/lexical/react/LexicalComposerContext';
import {
  LexicalTypeaheadMenuPlugin,
  MenuOption,
  type MenuTextMatch,
} from '@payloadcms/richtext-lexical/lexical/react/LexicalTypeaheadMenuPlugin';
import { $getSelection, $isRangeSelection } from '@payloadcms/richtext-lexical/lexical';
import { useDocumentInfo } from '@payloadcms/ui';

import { adminGet } from '../../lib/adminFetch';
import { varMenuItemStyle, varMenuStyle } from '../../components/adminUi/styles';

interface VarEntry {
  path: string;
  label: string;
  sample: string;
}

// Match `@` followed by variable-path chars (word chars AND dots), so dotted
// paths like `@org.name` keep filtering — the built-in trigger treats `.` as a
// boundary and closes the menu after the first dot.
const TRIGGER_RE = /(^|\s)@([\w.]*)$/;

function varTriggerFn(text: string): MenuTextMatch | null {
  const match = TRIGGER_RE.exec(text);
  if (match === null) return null;
  const maybeLead = match[1] ?? '';
  const query = match[2] ?? '';
  return {
    leadOffset: match.index + maybeLead.length,
    matchingString: query,
    replaceableString: `@${query}`,
  };
}

class VarOption extends MenuOption {
  path: string;
  label: string;
  sample: string;
  constructor(entry: VarEntry) {
    super(entry.path);
    this.path = entry.path;
    this.label = entry.label;
    this.sample = entry.sample;
  }
}

function VarMentionPlugin(): React.ReactElement {
  const [editor] = useLexicalComposerContext();
  const { id } = useDocumentInfo();
  const [vars, setVars] = useState<VarEntry[]>([]);
  const [query, setQuery] = useState<string | null>(null);

  // Fetch the variable list once the document has an id (saved). New docs show
  // an empty menu rather than erroring (same graceful pattern as other fields).
  useEffect(() => {
    if (!id) return;
    let alive = true;
    adminGet(`/api/presentations/${id}/vars`).then((res) => {
      if (alive && res.ok && Array.isArray(res.data?.vars)) setVars(res.data.vars as VarEntry[]);
    });
    return () => {
      alive = false;
    };
  }, [id]);

  const options = useMemo(() => {
    const q = (query ?? '').toLowerCase();
    return vars
      .filter((v) => !q || v.path.toLowerCase().includes(q))
      .slice(0, 12)
      .map((v) => new VarOption(v));
  }, [vars, query]);

  return (
    <LexicalTypeaheadMenuPlugin<VarOption>
      onQueryChange={setQuery}
      onSelectOption={(option, nodeToReplace, closeMenu) => {
        editor.update(() => {
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            nodeToReplace?.remove();
            selection.insertText(`{${option.path}}`);
          }
          closeMenu();
        });
      }}
      options={options}
      triggerFn={varTriggerFn}
      menuRenderFn={(anchorRef, { selectedIndex, selectOptionAndCleanUp, setHighlightedIndex }) => {
        if (!anchorRef.current || options.length === 0) return null;
        return createPortal(
          <div role="listbox" style={varMenuStyle}>
            {options.map((option, i) => (
              <div
                key={option.path}
                role="option"
                aria-selected={selectedIndex === i}
                tabIndex={-1}
                style={varMenuItemStyle(selectedIndex === i)}
                onMouseEnter={() => setHighlightedIndex(i)}
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectOptionAndCleanUp(option);
                }}
              >
                <span style={{ fontWeight: 600 }}>{option.label}</span>
                {option.sample ? (
                  <span
                    style={{
                      color: 'var(--theme-elevation-500)',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      maxWidth: '50%',
                    }}
                  >
                    {option.sample}
                  </span>
                ) : null}
              </div>
            ))}
          </div>,
          anchorRef.current,
        );
      }}
    />
  );
}

export default createClientFeature({
  plugins: [{ Component: VarMentionPlugin, position: 'normal' }],
});
