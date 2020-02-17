/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { useLayoutEffect, useRef } from 'react';

const TOOLTIP_OFFSET = 4;

export function useSmartTooltip({ mouseX, mouseY }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const element = ref.current;
    if (element != null) {
      if (
        mouseY + TOOLTIP_OFFSET + element.offsetHeight >=
        window.innerHeight
      ) {
        if (mouseY - TOOLTIP_OFFSET - element.offsetHeight > 0) {
          element.style.top = `${mouseY -
            element.offsetHeight -
            TOOLTIP_OFFSET}px`;
        } else {
          element.style.top = '0px';
        }
      } else {
        element.style.top = `${mouseY + TOOLTIP_OFFSET}px`;
      }

      if (mouseX + TOOLTIP_OFFSET + element.offsetWidth >= window.innerWidth) {
        if (mouseX - TOOLTIP_OFFSET - element.offsetWidth > 0) {
          element.style.left = `${mouseX -
            element.offsetWidth -
            TOOLTIP_OFFSET}px`;
        } else {
          element.style.left = '0px';
        }
      } else {
        element.style.left = `${mouseX + TOOLTIP_OFFSET}px`;
      }
    }
  });

  return ref;
}
