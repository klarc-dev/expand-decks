import { PRESENTATION_CANVAS } from '../documents/presentationContract';

/** Presentation compatibility constants, projected from the canonical template. */
export const SLIDE_CANVAS_WIDTH = PRESENTATION_CANVAS.width;
export const SLIDE_CANVAS_HEIGHT = PRESENTATION_CANVAS.height;
export const SLIDE_ASPECT_RATIO = `${SLIDE_CANVAS_WIDTH} / ${SLIDE_CANVAS_HEIGHT}`;
