import { readFileSync } from 'node:fs';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@payloadcms/ui', () => ({}));
vi.mock('next/navigation', () => ({ useRouter: vi.fn() }));
vi.mock('@/components/adminUi/AdminSurface', () => ({}));
import { approvalOutline } from '../AgentDraftButton';

const source = readFileSync('src/components/AgentDraftButton.tsx', 'utf8');

describe('agent draft focused surface', () => {
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
