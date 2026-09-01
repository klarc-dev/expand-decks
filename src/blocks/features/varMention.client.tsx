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

import './varMention.scss';

interface VarEntry {
  path: string;
  label: string;
  sample: string;
}

type VarsRequestState = 'idle' | 'loading' | 'ready' | 'failed';

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

type VarMentionMenuProps = {
  announceEmptyMessage: boolean;
  emptyMessage: string;
  options: VarOption[];
  selectedIndex: number | null;
  onHighlight: (index: number) => void;
  onSelect: (option: VarOption) => void;
};

function VarMentionMenu({
  announceEmptyMessage,
  emptyMessage,
  options,
  selectedIndex,
  onHighlight,
  onSelect,
}: VarMentionMenuProps) {
  if (options.length === 0) {
    return (
      <div
        aria-atomic={announceEmptyMessage || undefined}
        aria-live={announceEmptyMessage ? 'polite' : undefined}
        className="var-mention-menu var-mention-menu--empty"
        role={announceEmptyMessage ? 'status' : undefined}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div aria-label="Variables disponibles" className="var-mention-menu" role="listbox">
      {options.map((option, index) => (
        <button
          aria-selected={selectedIndex === index}
          className="var-mention-menu__option"
          id={`typeahead-item-${index}`}
          key={option.path}
          ref={(element) => option.setRefElement(element)}
          role="option"
          tabIndex={-1}
          type="button"
          onClick={() => onSelect(option)}
          onMouseEnter={() => onHighlight(index)}
        >
          <span className="var-mention-menu__label">{option.label}</span>
          {option.sample ? (
            <span className="var-mention-menu__sample">
              <span className="sr-only">Exemple : </span>
              {option.sample}
            </span>
          ) : null}
        </button>
      ))}
    </div>
  );
}

function VarMentionPlugin(): React.ReactElement {
  const [editor] = useLexicalComposerContext();
  const { id } = useDocumentInfo();
  const [vars, setVars] = useState<VarEntry[]>([]);
  const [requestState, setRequestState] = useState<VarsRequestState>('idle');
  const [query, setQuery] = useState<string | null>(null);

  // Fetch the variable list once the document has an id (saved). New docs show
  // an empty menu rather than erroring (same graceful pattern as other fields).
  useEffect(() => {
    if (!id) {
      setVars([]);
      setRequestState('idle');
      return;
    }
    let alive = true;
    setVars([]);
    setRequestState('loading');
    adminGet(`/api/presentations/${id}/vars`)
      .then((res) => {
        if (!alive) return;
        if (res.ok && Array.isArray(res.data?.vars)) {
          setVars(res.data.vars as VarEntry[]);
          setRequestState('ready');
        } else {
          setVars([]);
          setRequestState('failed');
        }
      })
      .catch(() => {
        if (!alive) return;
        setVars([]);
        setRequestState('failed');
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

  const emptyMessage =
    requestState === 'idle'
      ? 'Enregistrez la présentation pour utiliser les variables.'
      : requestState === 'loading'
        ? 'Chargement des variables…'
        : requestState === 'failed'
          ? 'Variables indisponibles.'
          : vars.length === 0
            ? 'Aucune variable disponible.'
            : 'Aucune variable correspondante.';
  const announceEmptyMessage = requestState === 'loading' || requestState === 'failed';

  useEffect(() => {
    if (options.length === 0) editor.getRootElement()?.removeAttribute('aria-activedescendant');
  }, [editor, options.length]);

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
        if (!anchorRef.current) return null;
        return createPortal(
          <VarMentionMenu
            announceEmptyMessage={announceEmptyMessage}
            emptyMessage={emptyMessage}
            onHighlight={(index) => {
              editor
                .getRootElement()
                ?.setAttribute('aria-activedescendant', `typeahead-item-${index}`);
              setHighlightedIndex(index);
            }}
            onSelect={selectOptionAndCleanUp}
            options={options}
            selectedIndex={selectedIndex}
          />,
          anchorRef.current,
        );
      }}
    />
  );
}

export default createClientFeature({
  plugins: [{ Component: VarMentionPlugin, position: 'normal' }],
});
