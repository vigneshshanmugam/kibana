/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiPortal,
  EuiSpacer,
  EuiTabbedContent,
  EuiTitle,
  EuiBadge,
  EuiToolTip
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import React, { Fragment } from 'react';
import styled from 'styled-components';
import { px, units } from '../../../../../../../style/variables';
import { Summary } from '../../../../../../shared/Summary';
import { TimestampTooltip } from '../../../../../../shared/TimestampTooltip';
import { DurationSummaryItem } from '../../../../../../shared/Summary/DurationSummaryItem';
import { Span } from '../../../../../../../../typings/es_schemas/ui/Span';
import { Transaction } from '../../../../../../../../typings/es_schemas/ui/Transaction';
import { DiscoverSpanLink } from '../../../../../../shared/Links/DiscoverLinks/DiscoverSpanLink';
import { Stacktrace } from '../../../../../../shared/Stacktrace';
import { ResponsiveFlyout } from '../ResponsiveFlyout';
import { DatabaseContext } from './DatabaseContext';
import { StickySpanProperties } from './StickySpanProperties';
import { HttpInfoSummaryItem } from '../../../../../../shared/Summary/HttpInfoSummaryItem';
import { SpanMetadata } from '../../../../../../shared/MetadataTable/SpanMetadata';
import { SyncBadge } from '../SyncBadge';
import { AutoSizedFlameGraph } from './AutoSizedFlamegraph';

function formatType(type: string) {
  switch (type) {
    case 'db':
      return 'DB';
    case 'hard-navigation':
      return i18n.translate(
        'xpack.apm.transactionDetails.spanFlyout.spanType.navigationTimingLabel',
        {
          defaultMessage: 'Navigation timing'
        }
      );
    default:
      return type;
  }
}

function formatSubtype(subtype: string | undefined) {
  switch (subtype) {
    case 'mysql':
      return 'MySQL';
    default:
      return subtype;
  }
}

function getSpanTypes(span: Span) {
  const { type, subtype, action } = span.span;

  return {
    spanType: formatType(type),
    spanSubtype: formatSubtype(subtype),
    spanAction: action
  };
}

const SpanBadge = styled(EuiBadge)`
  display: inline-block;
  margin-right: ${px(units.quarter)};
`;

const HttpInfoContainer = styled('div')`
  margin-right: ${px(units.quarter)};
`;

interface Props {
  span?: Span;
  parentTransaction?: Transaction;
  totalDuration?: number;
  onClose: () => void;
}

function createFlameGraphNode(name, value) {
  const actualName = name.split('$#')[0];
  return {
    name: actualName,
    value,
    children: [],
    selfTime: 0
  };
}

function getFlameGraphData(data) {
  const map = new Map();
  const { culprits, name, duration } = data;
  const rootNode = createFlameGraphNode(`${name}`, duration);
  let currLevel = null;
  /**
   * Merge frames on all stacks together
   */
  const updateMap = (key, totalTime) => {
    if (!map.has(key)) {
      map.set(key, {
        children: [],
        totalTime: 0,
        seen: false
      });
    }
    const value = map.get(key);
    if (currLevel) {
      if (value.totalTime + totalTime <= currLevel.totalTime) {
        value.totalTime += totalTime;
      }
      if (currLevel.children.indexOf(key) === -1) {
        currLevel.children.push(key);
      }
    } else {
      value.totalTime += totalTime;
    }
    currLevel = value;
  };

  for (const culprit of culprits) {
    const { totalTime, frames } = culprit;

    if (frames.length > 0) {
      currLevel = null;
    } else {
      if (currLevel) {
        const key = `stack-unavailable$#${data.start}`;
        updateMap(key, totalTime);
      }
      continue;
    }

    for (let depth = 0; depth < frames.length; depth++) {
      const frame = frames[depth];
      const key = `${frame}$#${depth}`;
      updateMap(key, totalTime);
    }
  }

  const bfs = (currFrame, currentValue, rootNode) => {
    const node = createFlameGraphNode(currFrame, currentValue.totalTime);
    if (rootNode.selfTime > 0) {
      rootNode.selfTime = rootNode.selfTime - node.value;
    } else {
      rootNode.selfTime = rootNode.value - node.value;
    }
    const currentChildFrames = currentValue.children;
    if (currentChildFrames.length === 0) {
      node.selfTime = node.value;
    }
    rootNode.children.push(node);

    for (const frame of currentChildFrames) {
      const nodeValue = map.get(frame);
      bfs(frame, nodeValue, node);
    }
    currentValue.seen = true;
  };

  /**
   * Combine the frames in to flamegraph chart data
   */
  for (const [key, value] of map.entries()) {
    if (value.seen) {
      continue;
    }
    bfs(key, value, rootNode);
  }
  return rootNode;
}

export function SpanFlyout({
  span,
  parentTransaction,
  totalDuration,
  onClose
}: Props) {
  if (!span) {
    return null;
  }

  const stackframes = span.span.stacktrace;
  const { trace } = span.experimental;
  const flameGraphData = {
    start: trace.start,
    end: trace.end,
    data: getFlameGraphData(trace)
  };
  const codeLanguage = parentTransaction?.service.language?.name;
  const dbContext = span.span.db;
  const httpContext = span.span.http;
  const spanTypes = getSpanTypes(span);
  const spanHttpStatusCode = httpContext?.response?.status_code;
  const spanHttpUrl = httpContext?.url?.original;
  const spanHttpMethod = httpContext?.method;

  return (
    <EuiPortal>
      <ResponsiveFlyout onClose={onClose} size="m" ownFocus={true}>
        <EuiFlyoutHeader hasBorder>
          <EuiFlexGroup>
            <EuiFlexItem grow={false}>
              <EuiTitle>
                <h2>
                  {i18n.translate(
                    'xpack.apm.transactionDetails.spanFlyout.spanDetailsTitle',
                    {
                      defaultMessage: 'Span details'
                    }
                  )}
                </h2>
              </EuiTitle>
            </EuiFlexItem>

            <EuiFlexItem grow={false}>
              <DiscoverSpanLink span={span}>
                <EuiButtonEmpty iconType="discoverApp">
                  {i18n.translate(
                    'xpack.apm.transactionDetails.spanFlyout.viewSpanInDiscoverButtonLabel',
                    {
                      defaultMessage: 'View span in Discover'
                    }
                  )}
                </EuiButtonEmpty>
              </DiscoverSpanLink>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <StickySpanProperties span={span} transaction={parentTransaction} />
          <EuiSpacer size="m" />
          <Summary
            items={[
              <TimestampTooltip time={span.timestamp.us / 1000} />,
              <DurationSummaryItem
                duration={span.span.duration.us}
                totalDuration={totalDuration}
                parentType="transaction"
              />,
              <>
                {spanHttpUrl && (
                  <HttpInfoContainer>
                    <HttpInfoSummaryItem
                      method={spanHttpMethod}
                      url={spanHttpUrl}
                      status={spanHttpStatusCode}
                    />
                  </HttpInfoContainer>
                )}
                <EuiToolTip
                  content={i18n.translate(
                    'xpack.apm.transactionDetails.spanFlyout.spanType',
                    { defaultMessage: 'Type' }
                  )}
                >
                  <SpanBadge color="hollow">{spanTypes.spanType}</SpanBadge>
                </EuiToolTip>
                {spanTypes.spanSubtype && (
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.apm.transactionDetails.spanFlyout.spanSubtype',
                      { defaultMessage: 'Subtype' }
                    )}
                  >
                    <SpanBadge color="hollow">
                      {spanTypes.spanSubtype}
                    </SpanBadge>
                  </EuiToolTip>
                )}
                {spanTypes.spanAction && (
                  <EuiToolTip
                    content={i18n.translate(
                      'xpack.apm.transactionDetails.spanFlyout.spanAction',
                      { defaultMessage: 'Action' }
                    )}
                  >
                    <SpanBadge color="hollow">{spanTypes.spanAction}</SpanBadge>
                  </EuiToolTip>
                )}
                <SyncBadge sync={span.span.sync} />
              </>
            ]}
          />
          <EuiHorizontalRule />
          <DatabaseContext dbContext={dbContext} />
          <EuiTabbedContent
            tabs={[
              {
                id: 'flamefraph',
                name: 'Flamegraph',
                content: (
                  <Fragment>
                    <EuiSpacer size="l" />
                    <AutoSizedFlameGraph result={flameGraphData} height={300} />
                  </Fragment>
                )
              },
              {
                id: 'stack-trace',
                name: i18n.translate(
                  'xpack.apm.transactionDetails.spanFlyout.stackTraceTabLabel',
                  {
                    defaultMessage: 'Stack Trace'
                  }
                ),
                content: (
                  <Fragment>
                    <EuiSpacer size="l" />
                    <Stacktrace
                      stackframes={stackframes}
                      codeLanguage={codeLanguage}
                    />
                  </Fragment>
                )
              },
              {
                id: 'metadata',
                name: i18n.translate(
                  'xpack.apm.propertiesTable.tabs.metadataLabel',
                  {
                    defaultMessage: 'Metadata'
                  }
                ),
                content: (
                  <Fragment>
                    <EuiSpacer size="m" />
                    <SpanMetadata span={span} />
                  </Fragment>
                )
              }
            ]}
          />
        </EuiFlyoutBody>
      </ResponsiveFlyout>
    </EuiPortal>
  );
}
