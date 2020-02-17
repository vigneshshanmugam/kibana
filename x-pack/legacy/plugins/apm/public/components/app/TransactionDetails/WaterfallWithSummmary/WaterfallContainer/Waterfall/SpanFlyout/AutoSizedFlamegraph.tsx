/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React, { Fragment, useRef, useState } from 'react';
import AutoSizer from 'react-virtualized-auto-sizer';
import { FlameGraph } from 'react-flame-graph';
import { useSmartTooltip } from './useSmartTooltip';

function getMousePos(relativeContainer, mouseEvent) {
  if (relativeContainer !== null) {
    const rect = relativeContainer.getBoundingClientRect();
    const mouseX = mouseEvent.clientX - rect.left;
    const mouseY = mouseEvent.clientY - rect.top;

    return { mouseX, mouseY };
  } else {
    return { mouseX: 0, mouseY: 0 };
  }
}

export function AutoSizedFlameGraph({ result, height }) {
  const containerRef = useRef(null);
  const [tooltipState, setTooltipState] = useState(null);

  const getToolTipValue = ({ name, selfTime, value }) => {
    const fnName = name.split(' (')[0];
    const timings = `${value} ms (self ${selfTime} ms)`;
    return timings + ' ' + fnName;
  };

  const onMouseOver = (event, data) => {
    setTooltipState({
      text: getToolTipValue(data),
      ...getMousePos(containerRef.current, event)
    });
  };

  const onMouseMove = (event, data) => {
    setTooltipState({
      text: getToolTipValue(data),
      ...getMousePos(containerRef.current, event)
    });
  };

  const onMouseOut = (event, data) => {
    setTooltipState(null);
  };

  const tooltipRef = useSmartTooltip({
    mouseX: tooltipState === null ? 0 : tooltipState.mouseX,
    mouseY: tooltipState === null ? 0 : tooltipState.mouseY
  });

  return (
    <div
      style={{
        height,
        backgroundColor: '#fff',
        boxSizing: 'border-box',
        borderRadius: '0.5rem',
        margin: '20px',
        padding: '10px',
        overflow: 'auto'
      }}
      ref={containerRef}
    >
      <AutoSizer>
        {({ height: autoSizerHeight, width }) => (
          <Fragment>
            <FlameGraph
              data={result.data}
              disableDefaultTooltips={true}
              height={autoSizerHeight}
              width={width}
              onMouseMove={onMouseMove}
              onMouseOver={onMouseOver}
              onMouseOut={onMouseOut}
            />
            {tooltipState !== null && (
              <div ref={tooltipRef} className="tooltip">
                {tooltipState.text}
              </div>
            )}
          </Fragment>
        )}
      </AutoSizer>
    </div>
  );
}
