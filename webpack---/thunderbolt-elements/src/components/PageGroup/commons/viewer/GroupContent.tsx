import * as React from 'react';
import { ReactElement } from 'react';
import { TransitionGroup } from 'react-transition-group';
import { IGroupContentProps } from '../commons.types';
import Transition from '../../../Transition/Transition';
import { TRANSITION_GROUP_ID } from '../constants';
import { getDataAttributes } from '../../../../core/commons/utils';

let pageDidMount: any;

function doViewTransition(
  onTransitionStart = () => {},
  onTransitionComplete = () => {},
  pageRendered: Promise<unknown>,
) {
  if (typeof window !== 'undefined') {
    // @ts-expect-error
    const transition = document.startViewTransition(async () => {
      await pageRendered;
    });

    transition.ready.then(onTransitionStart);
    return transition.finished.then(onTransitionComplete);
  }
}

const GroupContent: React.FC<IGroupContentProps> = props => {
  const {
    id = TRANSITION_GROUP_ID,
    transition = 'none',
    transitionDuration = 0,
    transitionEnabled = true,
    onTransitionComplete = () => {},
    onTransitionStarting = () => {},
    className,
    children,
    shouldUseViewTransition,
    isPageAfterMount,
    isPageBeforeMount,
    isFirstMount,
  } = props;

  const childrenArray = React.Children.toArray(children());
  const child = childrenArray[0] as ReactElement;
  const childId = child?.props.id;

  const noTransition = transition === 'none';
  const reverse = transition === 'SlideVertical';

  const supportsViewTransition =
    typeof window !== 'undefined' ? 'startViewTransition' in document : false;
  const useViewTransition = supportsViewTransition && shouldUseViewTransition;

  React.useEffect(() => {
    if (isPageAfterMount) {
      pageDidMount?.();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPageAfterMount]);

  if (
    !noTransition &&
    isPageBeforeMount &&
    !isFirstMount &&
    useViewTransition
  ) {
    const pageRendered = new Promise(resolve => {
      pageDidMount = resolve;
    });
    doViewTransition(onTransitionStarting, onTransitionComplete, pageRendered);
  }

  const content =
    noTransition || useViewTransition ? (
      children()
    ) : (
      <TransitionGroup
        id={id}
        {...getDataAttributes(props)}
        className={className}
        childFactory={_child => React.cloneElement(_child, { reverse })}
      >
        <Transition
          type={transition}
          key={childId}
          timeout={transitionDuration}
          onEntered={onTransitionComplete}
          onExiting={onTransitionStarting}
          enter={transitionEnabled}
          exit={transitionEnabled}
          unmountOnExit
        >
          {() => child}
        </Transition>
      </TransitionGroup>
    );

  return <>{content}</>;
};

export default GroupContent;
