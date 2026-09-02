import { readdirSync, readFileSync } from 'node:fs';
import { relative, resolve } from 'node:path';

import ts from 'typescript';
import { describe, expect, it } from 'vitest';

const COMPONENTS_DIR = resolve('src/components');

function getAttributeValue(attributes: ts.JsxAttributes, name: string): string | undefined {
  const attribute = attributes.properties.find(
    (property): property is ts.JsxAttribute =>
      ts.isJsxAttribute(property) && property.name.getText() === name,
  );
  if (!attribute?.initializer) return undefined;
  if (ts.isStringLiteral(attribute.initializer)) return attribute.initializer.text;
  if (
    ts.isJsxExpression(attribute.initializer) &&
    attribute.initializer.expression &&
    ts.isStringLiteral(attribute.initializer.expression)
  ) {
    return attribute.initializer.expression.text;
  }
  return '<dynamic>';
}

function rawTextControls() {
  const controls: string[] = [];
  const files = readdirSync(COMPONENTS_DIR, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith('.tsx'))
    .map((entry) => resolve(entry.parentPath, entry.name));

  for (const file of files) {
    const source = ts.createSourceFile(
      file,
      readFileSync(file, 'utf8'),
      ts.ScriptTarget.Latest,
      true,
      ts.ScriptKind.TSX,
    );

    function visit(node: ts.Node) {
      if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
        const tag = node.tagName.getText();
        const type = getAttributeValue(node.attributes, 'type');
        const isTextInput = tag === 'input' && (type === undefined || type === 'text');
        if (tag === 'textarea' || isTextInput) {
          const line = source.getLineAndCharacterOfPosition(node.getStart()).line + 1;
          controls.push(`${relative(process.cwd(), file)}:${line}:<${tag}>`);
        }
      }
      ts.forEachChild(node, visit);
    }

    visit(source);
  }

  return controls.sort();
}

function rawButtonsIn(filePath: string) {
  const file = resolve(filePath);
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const buttons: number[] = [];

  function visit(node: ts.Node) {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText() === 'button'
    ) {
      buttons.push(source.getLineAndCharacterOfPosition(node.getStart()).line + 1);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return buttons;
}

function rawInputsIn(filePath: string, inputType: string) {
  const file = resolve(filePath);
  const source = ts.createSourceFile(
    file,
    readFileSync(file, 'utf8'),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX,
  );
  const inputs: number[] = [];

  function visit(node: ts.Node) {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText() === 'input' &&
      getAttributeValue(node.attributes, 'type') === inputType
    ) {
      inputs.push(source.getLineAndCharacterOfPosition(node.getStart()).line + 1);
    }
    ts.forEachChild(node, visit);
  }

  visit(source);
  return inputs;
}

function sourceContains(filePath: string, text: string) {
  return readFileSync(resolve(filePath), 'utf8').includes(text);
}

describe('canonical custom admin controls', () => {
  it('keeps native text-entry ownership bounded to the adapter and audited exceptions', () => {
    expect(rawTextControls()).toEqual(['src/components/adminUi/AdminTextField.tsx:75:<input>']);
  });

  it('keeps TableEditor compact action semantics in the Payload Button owner', () => {
    expect(rawButtonsIn('src/components/TableEditor.tsx')).toEqual([]);
    expect(sourceContains('src/components/TableEditor.tsx', 'table-editor__action-glyph')).toBe(
      true,
    );
    expect(sourceContains('src/components/TableEditor.scss', '.btn__content')).toBe(false);
  });

  it('keeps TableEditor configuration failures in the canonical notice owner', () => {
    const path = 'src/components/TableEditor.tsx';
    expect(sourceContains(path, '<AdminNotice variant="error">')).toBe(true);
    expect(sourceContains(path, '<div>Configuration de cellule indisponible.</div>')).toBe(false);
  });

  it('keeps Google login layout out of Payload Button internals', () => {
    expect(sourceContains('src/components/GoogleLoginButton.scss', '.btn__content')).toBe(false);
    expect(sourceContains('src/components/GoogleLoginButton.scss', 'justify-content')).toBe(false);
    expect(sourceContains('src/components/GoogleLoginButton.scss', 'width: 100%')).toBe(true);
    expect(sourceContains('src/components/GoogleLoginButton.scss', 'margin-top: 16px')).toBe(true);
  });

  it('keeps TableEditor inline text entry in the canonical AdminTextField owner', () => {
    expect(rawInputsIn('src/components/TableEditor.tsx', 'text')).toEqual([]);
    expect(
      sourceContains('src/components/TableEditor.tsx', 'labelVisibility="screen-reader"'),
    ).toBe(true);
    expect(sourceContains('src/components/TableEditor.tsx', 'labelWrapperClassName')).toBe(false);
    expect(
      sourceContains('src/components/adminUi/AdminTextField.tsx', 'labelWrapperClassName'),
    ).toBe(false);
    expect(sourceContains('src/components/TableEditor.tsx', 'inputVariant="compact-edit"')).toBe(
      true,
    );
    expect(sourceContains('src/components/TableEditor.tsx', 'margin="none"')).toBe(true);
    expect(
      sourceContains(
        'src/components/TableEditor.scss',
        '&__column-header .admin-text-field {\n    flex: 1 1 auto;\n    min-width: 0;\n    margin: 0;',
      ),
    ).toBe(false);
    expect(sourceContains('src/components/adminUi/AdminTextField.tsx', 'data-input-variant')).toBe(
      true,
    );
    expect(sourceContains('src/components/TableEditor.scss', '&__control-row')).toBe(false);
    expect(sourceContains('src/components/TableEditor.scss', '.admin-text-field')).toBe(false);
    expect(
      sourceContains(
        'src/components/adminUi/AdminTextField.scss',
        "&[data-input-variant='compact-edit'] {\n    min-width: 0;\n    flex: 1 1 auto;",
      ),
    ).toBe(true);
    expect(sourceContains('src/components/adminUi/AdminTextField.tsx', 'inputClassName')).toBe(
      false,
    );
    expect(sourceContains('src/components/adminUi/AdminTextField.tsx', 'children?:')).toBe(false);
    expect(sourceContains('src/components/adminUi/AdminTextField.tsx', 'beforeInput?:')).toBe(
      false,
    );
    expect(sourceContains('src/components/ColorField.tsx', 'leadingControl=')).toBe(true);
    expect(sourceContains('src/components/GoogleFontField.tsx', 'suggestions=')).toBe(true);
    expect(sourceContains('src/components/GoogleFontField.tsx', 'fontFamilyPreview=')).toBe(true);
    expect(sourceContains('src/components/GoogleFontField.tsx', 'GoogleFontField.scss')).toBe(
      false,
    );
    expect(sourceContains('src/components/GoogleFontField.tsx', 'style: current')).toBe(false);
    expect(sourceContains('src/components/adminUi/AdminTextField.tsx', "| 'className'")).toBe(true);
    expect(sourceContains('src/components/adminUi/AdminTextField.tsx', "| 'style'")).toBe(true);
  });

  it('keeps TableEditor row actions grouped and grid geometry class-owned', () => {
    const path = 'src/components/TableEditor.tsx';
    expect(sourceContains(path, 'function TableActionGroup')).toBe(true);
    expect(sourceContains(path, 'function TableAction(')).toBe(true);
    expect(sourceContains(path, 'orientation="vertical"')).toBe(true);
    expect(
      sourceContains(path, '<span aria-hidden="true" className="table-editor__action-glyph">'),
    ).toBe(true);
    expect(sourceContains(path, 'gridTemplateColumns')).toBe(false);
    expect(sourceContains(path, "'--table-column-count': columns.length")).toBe(true);
    expect(
      sourceContains(
        path,
        '<RenderFields\n                    fields={cellFields}\n                    margins={false}',
      ),
    ).toBe(true);
    expect(sourceContains('src/components/TableEditor.scss', '.field-type')).toBe(false);
    expect(sourceContains('src/components/TableEditor.scss', '.btn')).toBe(false);
  });

  it('keeps the Google login action in the Payload Button owner', () => {
    expect(rawButtonsIn('src/components/GoogleLoginButton.tsx')).toEqual([]);
  });

  it('keeps SlidePreview revision actions in the Payload Button owner', () => {
    expect(rawButtonsIn('src/components/SlidePreview.tsx')).toEqual([]);
  });

  it('keeps AgentDraftButton run actions in the Payload Button owner', () => {
    expect(rawButtonsIn('src/components/AgentDraftButton.tsx')).toEqual([]);
  });

  it('keeps AgentDraftButton progress semantics in the typed progress owner', () => {
    const path = 'src/components/AgentDraftButton.tsx';
    expect(sourceContains(path, '<DraftProgress')).toBe(true);
    expect(sourceContains(path, "aria-current={current ? 'step' : undefined}")).toBe(true);
    expect(sourceContains(path, 'className="agent-draft__actions"')).toBe(true);
  });

  it('keeps the AgentDraft journal in one localized stable-identity owner', () => {
    const path = 'src/components/AgentDraftButton.tsx';
    expect(sourceContains(path, 'function AgentJournal')).toBe(true);
    expect(sourceContains(path, 'JOURNAL_STATUS_LABEL')).toBe(true);
    expect(sourceContains(path, 'useState(initiallyOpen)')).toBe(true);
    expect(
      sourceContains(path, 'onToggle={(event) => setExpanded(event.currentTarget.open)}'),
    ).toBe(true);
    expect(sourceContains(path, 'open={expanded}')).toBe(true);
    expect(sourceContains(path, 'aria-label="Événements du build agentique"')).toBe(true);
    expect(sourceContains(path, 'formatDraftEventDetail')).toBe(true);
    expect(sourceContains(path, 'formatDraftEventPhase')).toBe(true);
    expect(sourceContains(path, 'PHASE_LABEL')).toBe(false);
    expect(sourceContains(path, 'formatDraftEventTime')).toBe(true);
    expect(sourceContains(path, '<time className="agent-draft__event-time"')).toBe(true);
    expect(sourceContains(path, 'dateTime={time.dateTime}')).toBe(true);
    expect(sourceContains(path, 'JSON.stringify(event.detail)')).toBe(false);
    expect(sourceContains(path, 'key={`$' + '{event.ts}:$' + '{event.phase}`}')).toBe(true);
    expect(sourceContains(path, '<li key={i}>')).toBe(false);
    expect(sourceContains(path, 'Journal de l&apos;agent ({status})')).toBe(false);
  });

  it('keeps live AgentDraft feedback in one stable status owner', () => {
    const path = 'src/components/AgentDraftButton.tsx';
    expect(sourceContains(path, '<AdminPanel aria-busy={running}')).toBe(false);
    expect(sourceContains(path, 'function DraftRunStatus')).toBe(true);
    expect(sourceContains(path, "status === 'done'")).toBe(true);
    expect(sourceContains(path, "formatDraftEventPhase('done')")).toBe(true);
    expect(sourceContains(path, "formatDraftEventPhase('failed')")).toBe(true);
    expect(sourceContains(path, "formatDraftEventPhase('cancelled')")).toBe(true);
    expect(sourceContains(path, 'function getStatusEvent')).toBe(true);
    expect(sourceContains(path, "event?.phase === 'done'")).toBe(true);
    expect(sourceContains(path, "event?.phase === 'failed'")).toBe(true);
    expect(sourceContains(path, "event?.phase === 'cancelled'")).toBe(true);
    expect(sourceContains(path, 'const statusEvent = getStatusEvent')).toBe(true);
    expect(sourceContains(path, 'event={statusEvent}')).toBe(true);
    expect(sourceContains(path, 'event={last}')).toBe(false);
    expect(sourceContains(path, 'const message = running ?')).toBe(false);
    expect(
      sourceContains(path, "const message = [phase, detail].filter(Boolean).join(' — ')"),
    ).toBe(true);
    expect(sourceContains(path, 'aria-busy=')).toBe(false);
    expect(sourceContains(path, 'aria-live="polite"')).toBe(true);
    expect(sourceContains(path, 'role="status"')).toBe(true);
    expect(sourceContains(path, 'agent-draft__muted')).toBe(false);
    expect(sourceContains(path, 'draftProgress')).toBe(false);
  });

  it('keeps AgentDraft lifecycle controls in one labeled action owner', () => {
    const path = 'src/components/AgentDraftButton.tsx';
    expect(sourceContains(path, 'function DraftRunActions')).toBe(true);
    expect(sourceContains(path, '<fieldset className="agent-draft__actions">')).toBe(true);
    expect(
      sourceContains(path, '<legend className="sr-only">Actions du build agentique</legend>'),
    ).toBe(true);
    expect(sourceContains(path, 'agent-draft__action-buttons')).toBe(false);
    expect(sourceContains('src/components/AgentDraftButton.scss', '&__action-buttons')).toBe(false);
    expect(sourceContains(path, 'agent-draft__action-label')).toBe(false);
    expect(sourceContains(path, '<DraftRunActions')).toBe(true);
    expect(sourceContains(path, 'aria-atomic="true"')).toBe(true);
    expect(sourceContains(path, '<span className="sr-only">Build agentique : </span>')).toBe(true);
  });

  it('keeps the AgentDraft progress rail readable at narrow widths', () => {
    const styles = 'src/components/AgentDraftButton.scss';
    expect(sourceContains(styles, 'top: 0.75em')).toBe(true);
    expect(sourceContains(styles, 'overflow-wrap: anywhere')).toBe(true);
    expect(sourceContains(styles, 'white-space: nowrap')).toBe(false);
  });

  it('keeps AgentDraftButton checkbox semantics in the Payload CheckboxInput owner', () => {
    expect(rawInputsIn('src/components/AgentDraftButton.tsx', 'checkbox')).toEqual([]);
  });

  it('keeps generation and source-policy radio semantics in one typed feature-local owner', () => {
    expect(rawInputsIn('src/components/AgentDraftButton.tsx', 'radio')).toHaveLength(3);
  });

  it('keeps AgentDraftButton semantic groups in one feature-local owner', () => {
    const path = 'src/components/AgentDraftButton.tsx';
    expect(sourceContains(path, 'function DraftFieldGroup')).toBe(true);
    expect(sourceContains(path, 'className="agent-draft__options"')).toBe(false);
    expect(sourceContains(path, 'className="agent-draft__sources"')).toBe(false);
    expect(sourceContains(path, 'layout="list"')).toBe(false);
    expect(sourceContains(path, 'agent-draft__source-list')).toBe(false);
    expect(sourceContains('src/components/AgentDraftButton.scss', "&[data-layout='list']")).toBe(
      false,
    );
  });

  it('keeps shared panel and notice chrome in AdminSurface', () => {
    expect(sourceContains('src/components/AgentDraftButton.tsx', 'panelStyle')).toBe(false);
    expect(sourceContains('src/components/AgentDraftButton.tsx', 'errorBoxStyle')).toBe(false);
    expect(sourceContains('src/components/BuildStatusField.tsx', '<AdminPanel')).toBe(true);
    expect(
      sourceContains(
        'src/components/adminUi/AdminSurface.tsx',
        "Omit<React.HTMLAttributes<HTMLDivElement>, 'style'>",
      ),
    ).toBe(true);
    expect(
      sourceContains('src/components/adminUi/AdminSurface.tsx', "Omit<SurfaceProps, 'role'>"),
    ).toBe(true);
    expect(
      sourceContains('src/components/adminUi/AdminSurface.scss', '.admin-panel {\n  border:'),
    ).toBe(true);
    expect(
      sourceContains(
        'src/components/AgentDraftButton.scss',
        '&__panel {\n    margin-bottom: 20px;',
      ),
    ).toBe(true);
    expect(sourceContains('src/components/BuildStatusField.scss', 'margin-bottom: 20px')).toBe(
      true,
    );
    expect(sourceContains('src/components/adminUi/AdminSurface.scss', 'margin-top: 12px')).toBe(
      false,
    );
    expect(sourceContains('src/components/AgentDraftButton.tsx', 'agent-draft__save-notice')).toBe(
      true,
    );
    expect(sourceContains('src/components/AgentDraftButton.tsx', 'agent-draft__error')).toBe(true);
  });

  it('keeps build status presentation in the Payload Pill owner', () => {
    expect(sourceContains('src/components/BuildStatusField.tsx', '<Pill')).toBe(true);
    expect(sourceContains('src/components/BuildStatusField.tsx', "borderRadius: '999px'")).toBe(
      false,
    );
    expect(sourceContains('src/components/BuildStatusField.tsx', 'style={{')).toBe(false);
    expect(
      sourceContains(
        'src/components/BuildStatusField.tsx',
        '<span aria-atomic="true" aria-live="polite" role="status">',
      ),
    ).toBe(true);
    expect(
      sourceContains(
        'src/components/BuildStatusField.tsx',
        '<span className="sr-only">Statut du build : </span>',
      ),
    ).toBe(true);
    expect(sourceContains('src/components/BuildStatusField.tsx', '<AdminPanel aria-live=')).toBe(
      false,
    );
  });

  it('keeps failed build feedback in the canonical alert notice', () => {
    const path = 'src/components/BuildStatusField.tsx';
    expect(sourceContains(path, '<AdminNotice')).toBe(true);
    expect(sourceContains(path, 'variant="error"')).toBe(true);
    expect(sourceContains(path, 'function BuildErrorNotice')).toBe(true);
    expect(sourceContains(path, '<details className="build-status__error-details">')).toBe(true);
    expect(sourceContains(path, '<summary>Afficher le détail technique</summary>')).toBe(true);
    expect(sourceContains(path, 'title={info.lastBuildError}')).toBe(false);
    expect(sourceContains(path, '<span className="build-status__error"')).toBe(false);
    expect(
      sourceContains('src/components/adminUi/AdminSurface.scss', 'overflow-wrap: anywhere'),
    ).toBe(true);
    expect(sourceContains('src/components/BuildStatusField.scss', 'text-overflow: ellipsis')).toBe(
      false,
    );
    expect(sourceContains('src/components/BuildStatusField.scss', 'white-space: nowrap')).toBe(
      false,
    );
  });

  it('keeps build artifacts in one semantic external-link list owner', () => {
    const path = 'src/components/BuildStatusField.tsx';
    expect(sourceContains(path, 'function BuildArtifactLinks')).toBe(true);
    expect(sourceContains(path, 'aria-label="Artefacts du build"')).toBe(true);
    expect(sourceContains(path, '<span aria-hidden="true"> ↗</span>')).toBe(true);
    expect(sourceContains(path, '(nouvel onglet)')).toBe(true);
    expect(sourceContains(path, 'className="build-status__link"')).toBe(false);
  });

  it('keeps build metadata in one labeled definition-list owner', () => {
    const path = 'src/components/BuildStatusField.tsx';
    expect(sourceContains(path, 'function BuildMetadata')).toBe(true);
    expect(sourceContains(path, 'aria-label="Informations du build"')).toBe(true);
    expect(sourceContains(path, '<time dateTime={requestedAt}>')).toBe(true);
    expect(sourceContains(path, 'className="build-status__meta"')).toBe(false);
  });

  it('keeps SlidePreview errors in the canonical alert notice', () => {
    expect(sourceContains('src/components/SlidePreview.tsx', '<AdminNotice')).toBe(true);
    expect(sourceContains('src/components/SlidePreview.tsx', 'density="compact"')).toBe(true);
    expect(sourceContains('src/components/SlidePreview.tsx', 'styles.error')).toBe(false);
    expect(
      sourceContains('src/components/SlidePreview.scss', '&__error {\n    margin: 0 0 8px;\n  }'),
    ).toBe(true);
  });

  it('keeps SlidePreview static geometry in semantic classes', () => {
    const path = 'src/components/SlidePreview.tsx';
    expect(sourceContains(path, 'const styles =')).toBe(false);
    expect(sourceContains(path, 'styles.wrapper')).toBe(false);
    expect(
      sourceContains(path, '<AdminPanel className="slide-preview__ai-panel" density="compact"'),
    ).toBe(true);
    expect(sourceContains(path, 'className="slide-preview__frame"')).toBe(true);
    expect(sourceContains(path, 'className="slide-preview__revision-field"')).toBe(true);
    expect(sourceContains('src/components/SlidePreview.scss', '.field-type')).toBe(false);
    expect(
      sourceContains('src/components/SlidePreview.scss', 'background: var(--theme-elevation-50)'),
    ).toBe(false);
  });

  it('keeps SlidePreview async and rendered states explicitly exposed', () => {
    const path = 'src/components/SlidePreview.tsx';
    expect(sourceContains(path, 'aria-busy={loading}')).toBe(false);
    expect(sourceContains(path, 'aria-busy=')).toBe(false);
    expect(sourceContains(path, 'aria-live="polite"')).toBe(true);
    expect(sourceContains(path, 'aria-atomic="true"')).toBe(true);
    expect(sourceContains(path, 'role="status"')).toBe(true);
    expect(
      sourceContains(path, '<span className="sr-only">Aperçu de la diapositive : </span>'),
    ).toBe(true);
    expect(sourceContains(path, 'aria-label="Rendu de la diapositive"')).toBe(true);
    expect(sourceContains(path, 'role="img"')).toBe(true);
  });

  it('keeps SlideFrame static pane ownership in semantic classes', () => {
    const path = 'src/components/SlideFrame.tsx';
    expect(sourceContains(path, 'const styles =')).toBe(false);
    expect(sourceContains(path, 'styles.imagePane')).toBe(false);
    expect(sourceContains(path, 'className="slide-frame__image"')).toBe(true);
    expect(sourceContains(path, 'style={{ backgroundImage:')).toBe(true);
  });

  it('keeps the membership state page free of static React style recipes', () => {
    const path = 'src/app/(frontend)/membership-pending/page.tsx';
    expect(sourceContains(path, 'const styles =')).toBe(false);
    expect(sourceContains(path, 'style={')).toBe(false);
    expect(sourceContains(path, 'className="membership-pending__card"')).toBe(true);
  });

  it('keeps Klarc mark sizing behind bounded semantic variants', () => {
    const path = 'src/components/KlarcMark.tsx';
    expect(sourceContains(path, "size?: 'icon' | 'logo'")).toBe(true);
    expect(sourceContains(path, "'alt' | 'height' | 'src' | 'style' | 'width'")).toBe(true);
    expect(sourceContains(path, 'style={{')).toBe(false);
    expect(sourceContains('src/components/KlarcLogo.tsx', 'size={120}')).toBe(false);
    expect(sourceContains('src/components/KlarcIcon.tsx', 'size={28}')).toBe(false);
  });

  it('keeps the variable mention listbox styled by its semantic menu classes', () => {
    const path = 'src/blocks/features/varMention.client.tsx';
    expect(sourceContains(path, 'function VarMentionMenu')).toBe(true);
    expect(sourceContains(path, '<VarMentionMenu')).toBe(true);
    expect(sourceContains(path, "role={announceEmptyMessage ? 'status' : undefined}")).toBe(true);
    expect(sourceContains(path, "aria-live={announceEmptyMessage ? 'polite' : undefined}")).toBe(
      true,
    );
    expect(sourceContains(path, "requestState === 'loading' || requestState === 'failed'")).toBe(
      true,
    );
    expect(
      sourceContains(path, "type VarsRequestState = 'idle' | 'loading' | 'ready' | 'failed'"),
    ).toBe(true);
    expect(sourceContains(path, 'Chargement des variables…')).toBe(true);
    expect(sourceContains(path, 'Variables indisponibles.')).toBe(true);
    expect(sourceContains(path, 'Enregistrez la présentation pour utiliser les variables.')).toBe(
      true,
    );
    expect(sourceContains(path, 'Aucune variable disponible.')).toBe(true);
    expect(sourceContains(path, 'Aucune variable correspondante.')).toBe(true);
    expect(sourceContains(path, '.catch(() => {')).toBe(true);
    expect(
      sourceContains(path, "if (!id) {\n      setVars([]);\n      setRequestState('idle');"),
    ).toBe(true);
    expect(
      sourceContains(path, "let alive = true;\n    setVars([]);\n    setRequestState('loading');"),
    ).toBe(true);
    expect(sourceContains(path, "removeAttribute('aria-activedescendant')")).toBe(true);
    expect(sourceContains(path, 'options.length === 0) return null')).toBe(false);
    expect(sourceContains(path, 'role="listbox"')).toBe(true);
    expect(sourceContains(path, 'role="option"')).toBe(true);
    expect(sourceContains(path, 'aria-selected')).toBe(true);
    expect(sourceContains(path, '<button')).toBe(true);
    expect(sourceContains(path, 'type="button"')).toBe(true);
    expect(sourceContains(path, 'onClick={() => onSelect(option)}')).toBe(true);
    expect(sourceContains(path, 'onMouseDown=')).toBe(false);
    expect(sourceContains(path, '<div\n          aria-selected')).toBe(false);
    expect(sourceContains(path, `id={\`typeahead-item-\${index}\`}`)).toBe(true);
    expect(sourceContains(path, 'ref={(element) => option.setRefElement(element)}')).toBe(true);
    expect(sourceContains(path, ".setAttribute('aria-activedescendant'")).toBe(true);
    expect(sourceContains(path, '<span className="sr-only">Exemple : </span>')).toBe(true);
    expect(sourceContains(path, 'varMenuStyle')).toBe(false);
    expect(sourceContains(path, 'varMenuItemStyle')).toBe(false);
    const styles = 'src/blocks/features/varMention.scss';
    expect(sourceContains(styles, 'overflow-wrap: anywhere')).toBe(true);
    expect(sourceContains(styles, 'text-overflow: ellipsis')).toBe(false);
    expect(sourceContains(styles, 'white-space: nowrap')).toBe(false);
    expect(sourceContains(styles, 'max-height: min(280px, calc(100dvh - 24px))')).toBe(true);
    expect(sourceContains(styles, 'max-width: min(32rem, calc(100vw - 16px))')).toBe(true);
    expect(sourceContains(styles, 'overscroll-behavior: contain')).toBe(true);
    expect(sourceContains(styles, 'scrollbar-gutter: stable')).toBe(true);
    expect(sourceContains(styles, '&:focus-visible')).toBe(true);
  });
});
