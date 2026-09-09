import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@payloadcms/ui', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: vi.fn() }));
vi.mock('@/components/adminUi/AdminSurface', () => ({}));
import { approvalOutline, validateSlideCountRange } from '../AgentDraftButton';

const source = readFileSync('src/components/AgentDraftButton.tsx', 'utf8');

describe('agent draft focused surface', () => {
  it('leaves both empty bounds automatic and accepts inclusive limits and exact counts', () => {
    expect(validateSlideCountRange(undefined, undefined)).toEqual({ range: undefined, error: '' });
    expect(validateSlideCountRange(null, null)).toEqual({ range: undefined, error: '' });
    for (const [min, max] of [
      [3, 40],
      [3, 3],
      [40, 40],
      [10, 15],
    ]) {
      expect(validateSlideCountRange(min, max)).toEqual({ range: { min, max }, error: '' });
    }
  });

  it.each([
    [3, null],
    [null, 40],
    [undefined, 10],
    [10, undefined],
    [2, 10],
    [3, 41],
    [0, 10],
    [10, 9],
    [3.5, 10],
    [3, 10.5],
    [NaN, 10],
    [3, Infinity],
  ])('rejects invalid bounds %s–%s with an inline French error', (min, max) => {
    const result = validateSlideCountRange(min, max);
    expect(result.range).toBeUndefined();
    expect(result.error).toContain('minimum et un maximum entiers entre 3 et 40');
  });

  it('keeps optional native numeric controls near the brief and guards the request', () => {
    expect(source).toContain('<NumberField');
    expect(source).toContain('min: MIN_SLIDES');
    expect(source).toContain('max: MAX_SLIDES');
    expect(source).toContain('step: 1');
    expect(source).toContain('disableFormData: true');
    expect(source).toContain('<FieldPathContext.Provider value={path}>');
    expect(source.indexOf('label="Nombre de slides (facultatif)"')).toBeLessThan(
      source.indexOf('<SourceControls\n'),
    );
    expect(source).toContain('if (rangeError) return;');
    expect(source).toContain('!slideCountError &&');
    expect(source).toContain('...(slideCountRange ? { slideCountRange } : {})');
    expect(source).toContain('<AdminNotice variant="error">{slideCountError}</AdminNotice>');
    expect(source).toContain('Couverture et conclusion incluses.');
    expect(source).toContain('uniquement les nouvelles slides.');
  });

  it('reads the persisted approval outline without accepting Mastra paths or malformed items', () => {
    const outline = [{ title: 'Décider', intent: 'Comparer les options' }];
    expect(approvalOutline({ reason: 'approval', outline })).toEqual(outline);
    for (const value of [
      null,
      [['approval']],
      { outline: [] },
      { outline: [null] },
      { outline: [{ title: 'Only title' }] },
    ]) {
      expect(approvalOutline(value)).toEqual([]);
    }
  });

  it('hydrates approval from the durable run, not the local next-run checkbox', () => {
    expect(source).toContain('setOutline(approvalOutline(run?.suspended))');
    expect(source).toContain('canApprove={outline.length > 0}');
    expect(source).not.toContain('hasRun && approvalRequired');
    expect(source).toContain('disabled={pending || !canApprove}');
  });

  it('preserves one focused path and hides secondary options by default', () => {
    expect(source).not.toContain('<AdminPanel');
    expect(source).toContain('<details className="agent-draft__advanced">');
    expect(source).toContain('<details className="agent-draft__journal">');
    expect(source).toContain("useState<DraftMode>('revise')");
    expect(source).toContain("mode: hasSlides ? mode : 'replace'");
    expect(source.indexOf('<SourceControls\n')).toBeLessThan(
      source.indexOf('<details className="agent-draft__advanced">'),
    );
    expect(source).not.toContain('Voir les détails du run');
    expect(source).not.toContain('encodeURIComponent(ledgerId)');
  });

  it('invalidates polls around commands and catches failed lifecycle actions', () => {
    expect(source).toContain('request !== requestRef.current');
    expect(source).toContain('if (!runId || commandRef.current) return;');
    expect(source).toContain("throw new Error(data.error || 'Action impossible. Réessayez.')");
    expect(source).toContain('setPending(false)');
  });

  it('hides stored machine metadata only at the admin layer', () => {
    const config = readFileSync('src/collections/Presentations.ts', 'utf8');
    for (const name of ['draftStatus', 'draftSources', 'draftEvents', 'draftEvidence']) {
      const field = config.slice(config.indexOf(`name: '${name}'`));
      expect(field.slice(0, field.indexOf('},'))).toContain('hidden: true');
    }
  });
});
