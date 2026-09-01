'use client';

import React, { useCallback, useMemo } from 'react';
import type { ArrayFieldClientProps, FormState, Validate } from 'payload';
import {
  Button,
  FieldDescription,
  FieldError,
  RenderFields,
  useField,
  useForm,
  useFormFields,
} from '@payloadcms/ui';

import { AdminTextField } from '@/components/adminUi/AdminTextField';
import { AdminNotice } from '@/components/adminUi/AdminSurface';
import { SLIDE_LIMITS } from '@/blocks/spec/limits';

import './TableEditor.scss';

const { min: MIN_COLUMNS, max: MAX_COLUMNS } = SLIDE_LIMITS.table.columns;
const { min: MIN_ROWS, max: MAX_ROWS } = SLIDE_LIMITS.table.rows;

type TableActionGroupProps = {
  children: React.ReactNode;
  label: string;
  orientation?: 'horizontal' | 'vertical';
};

function TableActionGroup({ children, label, orientation = 'horizontal' }: TableActionGroupProps) {
  return (
    <fieldset aria-label={label} className="table-editor__controls" data-orientation={orientation}>
      {children}
    </fieldset>
  );
}

type TableActionProps = {
  children: React.ReactNode;
  disabled: boolean;
  label: string;
  onClick: () => void;
};

function TableAction({ children, disabled, label, onClick }: TableActionProps) {
  return (
    <Button
      aria-label={label}
      buttonStyle="transparent"
      className="table-editor__compact-action"
      disabled={disabled}
      margin={false}
      onClick={onClick}
      size="xsmall"
      type="button"
    >
      <span aria-hidden="true" className="table-editor__action-glyph">
        {children}
      </span>
    </Button>
  );
}

function id() {
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function fieldState(value: unknown) {
  return { initialValue: value, passesCondition: true, valid: true, value };
}

function hasContent(value: unknown): boolean {
  if (value == null || value === '') return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.some(hasContent);
  if (typeof value === 'object') {
    const record = value as Record<string, unknown>;
    if (typeof record.text === 'string' && record.text.trim()) return true;
    return Object.entries(record).some(([key, child]) => key !== 'version' && hasContent(child));
  }
  return false;
}

export function createRowState(columnCount: number): FormState {
  const cells = Array.from({ length: columnCount }, () => ({ id: id() }));
  const state: FormState = {
    cells: {
      disableFormData: true,
      initialValue: columnCount,
      passesCondition: true,
      rows: cells,
      valid: true,
      value: columnCount,
    },
  };
  cells.forEach((cell, index) => {
    state[`cells.${index}.id`] = fieldState(cell.id);
    state[`cells.${index}.value`] = fieldState(undefined);
  });
  return state;
}

function HeaderInput({ path, readOnly }: { path: string; readOnly: boolean }) {
  const { setValue, value } = useField<string>({ path });
  return (
    <AdminTextField
      inputProps={{
        disabled: readOnly,
        onChange: (event) => setValue(event.target.value),
        placeholder: 'En-tête',
        value: value ?? '',
      }}
      inputVariant="compact-edit"
      label="En-tête de colonne"
      labelVisibility="screen-reader"
      margin="none"
      path={path}
    />
  );
}

export default function TableEditor(props: ArrayFieldClientProps) {
  const { field, path, readOnly = false, schemaPath = field.name } = props;
  const blockPath = path.split('.').slice(0, -1).join('.');
  const columnsPath = `${blockPath}.columns`;
  const rowsPath = path;
  const columns = useFormFields(([fields]) => fields[columnsPath]?.rows ?? []);
  const rows = useFormFields(([fields]) => fields[rowsPath]?.rows ?? []);
  const formFields = useFormFields(([fields]) => fields);
  const { errorMessage, showError } = useField<number>({
    hasRows: true,
    path: rowsPath,
    validate: props.validate as Validate | undefined,
  });
  const { addFieldRow, moveFieldRow, removeFieldRow } = useForm();

  const cellsField = field.fields[0];
  const cellFields = cellsField && 'fields' in cellsField ? cellsField.fields : undefined;

  const addColumn = useCallback(() => {
    if (columns.length >= MAX_COLUMNS) return;
    addFieldRow({ path: columnsPath, schemaPath: `${schemaPath.replace(/\.rows$/, '')}.columns` });
    rows.forEach((_, rowIndex) => {
      addFieldRow({
        path: `${rowsPath}.${rowIndex}.cells`,
        schemaPath: `${schemaPath}.cells`,
      });
    });
  }, [addFieldRow, columns.length, columnsPath, rows, rowsPath, schemaPath]);

  const removeColumn = useCallback(
    (columnIndex: number) => {
      if (columns.length <= MIN_COLUMNS) return;
      const populated = rows.some((_, rowIndex) =>
        hasContent(formFields[`${rowsPath}.${rowIndex}.cells.${columnIndex}.value`]?.value),
      );
      if (populated && !window.confirm('Supprimer cette colonne et son contenu ?')) return;
      removeFieldRow({ path: columnsPath, rowIndex: columnIndex });
      rows.forEach((_, rowIndex) => {
        removeFieldRow({ path: `${rowsPath}.${rowIndex}.cells`, rowIndex: columnIndex });
      });
    },
    [columns.length, columnsPath, formFields, removeFieldRow, rows, rowsPath],
  );

  const moveColumn = useCallback(
    (from: number, to: number) => {
      if (to < 0 || to >= columns.length) return;
      moveFieldRow({ moveFromIndex: from, moveToIndex: to, path: columnsPath });
      rows.forEach((_, rowIndex) => {
        moveFieldRow({
          moveFromIndex: from,
          moveToIndex: to,
          path: `${rowsPath}.${rowIndex}.cells`,
        });
      });
    },
    [columns.length, columnsPath, moveFieldRow, rows, rowsPath],
  );

  const addRow = useCallback(() => {
    if (rows.length >= MAX_ROWS) return;
    addFieldRow({
      path: rowsPath,
      schemaPath,
      subFieldState: createRowState(columns.length),
    });
  }, [addFieldRow, columns.length, rows.length, rowsPath, schemaPath]);

  const columnIndexes = useMemo(() => columns.map((_, index) => index), [columns]);

  if (!cellFields) {
    return <AdminNotice variant="error">Configuration de cellule indisponible.</AdminNotice>;
  }

  return (
    <div className="table-editor">
      <div className="table-editor__label-row">
        <div>
          <strong>{typeof field.label === 'string' ? field.label : 'Tableau'}</strong>
          <FieldDescription description={field.admin?.description} path={rowsPath} />
        </div>
        {!readOnly ? (
          <div className="table-editor__summary">
            {columns.length}/{MAX_COLUMNS} colonnes · {rows.length}/{MAX_ROWS} lignes
          </div>
        ) : null}
      </div>
      {showError ? <FieldError message={errorMessage} path={rowsPath} /> : null}

      <div className="table-editor__scroll">
        <div
          className="table-editor__grid"
          style={{ '--table-column-count': columns.length } as React.CSSProperties}
        >
          <div className="table-editor__corner" aria-hidden="true" />
          {columnIndexes.map((columnIndex) => (
            <div
              className="table-editor__column-header"
              key={columns[columnIndex]?.id ?? columnIndex}
            >
              <HeaderInput path={`${columnsPath}.${columnIndex}.header`} readOnly={readOnly} />
              {!readOnly ? (
                <TableActionGroup label={`Actions colonne ${columnIndex + 1}`}>
                  <TableAction
                    disabled={columnIndex === 0}
                    label={`Déplacer la colonne ${columnIndex + 1} à gauche`}
                    onClick={() => moveColumn(columnIndex, columnIndex - 1)}
                  >
                    ←
                  </TableAction>
                  <TableAction
                    disabled={columnIndex === columns.length - 1}
                    label={`Déplacer la colonne ${columnIndex + 1} à droite`}
                    onClick={() => moveColumn(columnIndex, columnIndex + 1)}
                  >
                    →
                  </TableAction>
                  <TableAction
                    disabled={columns.length <= MIN_COLUMNS}
                    label={`Supprimer la colonne ${columnIndex + 1}`}
                    onClick={() => removeColumn(columnIndex)}
                  >
                    ×
                  </TableAction>
                </TableActionGroup>
              ) : null}
            </div>
          ))}

          {rows.map((row, rowIndex) => (
            <React.Fragment key={row.id ?? rowIndex}>
              <div className="table-editor__row-actions">
                <span>{rowIndex + 1}</span>
                {!readOnly ? (
                  <TableActionGroup label={`Actions ligne ${rowIndex + 1}`} orientation="vertical">
                    <TableAction
                      disabled={rowIndex === 0}
                      label={`Monter la ligne ${rowIndex + 1}`}
                      onClick={() =>
                        moveFieldRow({
                          moveFromIndex: rowIndex,
                          moveToIndex: rowIndex - 1,
                          path: rowsPath,
                        })
                      }
                    >
                      ↑
                    </TableAction>
                    <TableAction
                      disabled={rowIndex === rows.length - 1}
                      label={`Descendre la ligne ${rowIndex + 1}`}
                      onClick={() =>
                        moveFieldRow({
                          moveFromIndex: rowIndex,
                          moveToIndex: rowIndex + 1,
                          path: rowsPath,
                        })
                      }
                    >
                      ↓
                    </TableAction>
                    <TableAction
                      disabled={rows.length <= MIN_ROWS}
                      label={`Supprimer la ligne ${rowIndex + 1}`}
                      onClick={() => removeFieldRow({ path: rowsPath, rowIndex })}
                    >
                      ×
                    </TableAction>
                  </TableActionGroup>
                ) : null}
              </div>
              {columnIndexes.map((columnIndex) => (
                <div className="table-editor__cell" key={`${row.id}-${columns[columnIndex]?.id}`}>
                  <RenderFields
                    fields={cellFields}
                    margins={false}
                    parentIndexPath={`${props.indexPath ?? ''}-${rowIndex}-${columnIndex}`}
                    parentPath={`${rowsPath}.${rowIndex}.cells.${columnIndex}`}
                    parentSchemaPath={`${schemaPath}.cells`}
                    permissions={props.permissions ?? {}}
                    readOnly={readOnly}
                  />
                </div>
              ))}
            </React.Fragment>
          ))}
        </div>
      </div>

      {!readOnly ? (
        <div className="table-editor__footer">
          <Button
            buttonStyle="secondary"
            disabled={rows.length >= MAX_ROWS}
            margin={false}
            onClick={addRow}
            size="small"
            type="button"
          >
            Ajouter une ligne
          </Button>
          <Button
            buttonStyle="secondary"
            disabled={columns.length >= MAX_COLUMNS}
            onClick={addColumn}
            size="small"
            type="button"
          >
            Ajouter une colonne
          </Button>
        </div>
      ) : null}
    </div>
  );
}
