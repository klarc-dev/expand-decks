'use client';

import React, { useId, useState } from 'react';
import { Tooltip, useTranslation } from '@payloadcms/ui';
import { getTranslation } from '@payloadcms/translations';
import type { FieldDescriptionClientComponent } from 'payload';

import './FieldTooltipDescription.scss';

const FieldTooltipDescription: FieldDescriptionClientComponent = ({ description }) => {
  const { i18n } = useTranslation();
  const tooltipId = useId();
  const [show, setShow] = useState(false);

  if (!description) return null;

  const content = getTranslation(description, i18n);

  return (
    <span className="field-tooltip-description">
      <button
        aria-describedby={show ? tooltipId : undefined}
        aria-label={`Informations : ${content}`}
        className="field-tooltip-description__trigger"
        onBlur={() => setShow(false)}
        onFocus={() => setShow(true)}
        onMouseEnter={() => setShow(true)}
        onMouseLeave={() => setShow(false)}
        type="button"
      >
        ?
      </button>
      <Tooltip
        className="field-tooltip-description__tooltip"
        delay={150}
        position="top"
        show={show}
        staticPositioning
      >
        <span id={tooltipId}>{content}</span>
      </Tooltip>
    </span>
  );
};

export default FieldTooltipDescription;
