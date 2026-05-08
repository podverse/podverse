'use client';

import type { ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';
import { FaInfoCircle } from 'react-icons/fa';

import { Button } from '../../button/Button/Button';
import { Tooltip } from '../../overlays/Tooltip/Tooltip';

import styles from './PopoverIcon.module.scss';

export type PopoverIconProps = {
  /** Tooltip/popover body — localize in the app. */
  body: ReactNode;
  /** Accessible name for the trigger (required; localize in the app). */
  ariaLabel: string;
  /** Optional trigger icon; defaults to an info circle. */
  icon?: ReactNode;
};

type PopoverPosition = {
  top: number;
  left: number;
  width: number;
  arrowLeft: number;
};

export function PopoverIcon({ body, ariaLabel, icon }: PopoverIconProps) {
  const triggerIcon = icon ?? <FaInfoCircle className={styles.icon} />;
  const [isOpen, setIsOpen] = useState(false);
  const [isPinned, setIsPinned] = useState(false);
  const [position, setPosition] = useState<PopoverPosition | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen || !buttonRef.current) {
      setPosition(null);
      return;
    }

    const calculatePosition = () => {
      if (!buttonRef.current) {
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportPadding = 16;
      const minWidth = 200;
      const maxWidth = 400;

      const spaceToLeft = buttonRef.current.getBoundingClientRect().left;
      const spaceToRight = viewportWidth - buttonRef.current.getBoundingClientRect().right;
      const totalAvailableSpace = spaceToLeft + spaceToRight - viewportPadding * 2;

      let popoverWidth = Math.min(maxWidth, Math.max(minWidth, totalAvailableSpace));

      const buttonCenterX =
        buttonRef.current.getBoundingClientRect().left +
        buttonRef.current.getBoundingClientRect().width / 2;
      let popoverLeft = buttonCenterX - popoverWidth / 2;

      if (popoverLeft < viewportPadding) {
        popoverLeft = viewportPadding;
        const maxWidthFromLeft = viewportWidth - viewportPadding - viewportPadding;
        popoverWidth = Math.min(popoverWidth, maxWidthFromLeft);
      }

      if (popoverLeft + popoverWidth > viewportWidth - viewportPadding) {
        popoverLeft = viewportWidth - viewportPadding - popoverWidth;
        const maxWidthFromRight = viewportWidth - viewportPadding - viewportPadding;
        popoverWidth = Math.min(popoverWidth, maxWidthFromRight);
      }

      if (popoverWidth < minWidth) {
        popoverWidth = minWidth;
        if (popoverLeft + popoverWidth > viewportWidth - viewportPadding) {
          popoverLeft = viewportWidth - viewportPadding - popoverWidth;
        }
        if (popoverLeft < viewportPadding) {
          popoverLeft = viewportPadding;
        }
      }

      const arrowLeft = buttonCenterX - popoverLeft;
      const arrowPadding = 20;
      const clampedArrowLeft = Math.max(
        arrowPadding,
        Math.min(popoverWidth - arrowPadding, arrowLeft)
      );

      const marginFromButton = 8;
      const estimatedPopoverHeight = 100;
      const popoverTop =
        buttonRef.current.getBoundingClientRect().top - estimatedPopoverHeight - marginFromButton;

      setPosition({
        top: popoverTop,
        left: popoverLeft,
        width: popoverWidth,
        arrowLeft: clampedArrowLeft,
      });
    };

    calculatePosition();

    if (isPinned) {
      const handleScroll = () => {
        calculatePosition();
      };
      const handleResize = () => {
        calculatePosition();
      };
      window.addEventListener('scroll', handleScroll, true);
      window.addEventListener('resize', handleResize);
      return () => {
        window.removeEventListener('scroll', handleScroll, true);
        window.removeEventListener('resize', handleResize);
      };
    }

    return undefined;
  }, [isOpen, isPinned]);

  useEffect(() => {
    if (!isOpen || !isPinned) {
      return;
    }

    function handleClickOutside(event: MouseEvent) {
      const target = event.target;
      if (
        target instanceof Node &&
        containerRef.current &&
        !containerRef.current.contains(target) &&
        popoverRef.current &&
        !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
        setIsPinned(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, isPinned]);

  const handleClick = () => {
    const newState = !isOpen;
    setIsOpen(newState);
    setIsPinned(newState);
  };

  const handleMouseEnter = () => {
    if (!isPinned) {
      setIsOpen(true);
    }
  };

  const handleMouseLeave = () => {
    if (!isPinned) {
      setIsOpen(false);
    }
  };

  return (
    <div
      ref={containerRef}
      className={styles.container}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <Button
        ref={buttonRef}
        variant="unstyled"
        onClick={handleClick}
        aria-label={ariaLabel}
        aria-expanded={isOpen}
        aria-haspopup="dialog"
        type="button"
        className={styles.iconButton}
      >
        {triggerIcon}
      </Button>
      {isOpen && position && (
        <Tooltip
          ref={popoverRef}
          showArrow
          arrowLeft={position.arrowLeft}
          pointerEvents={isPinned ? 'auto' : 'none'}
          style={{
            top: position.top,
            left: position.left,
            width: position.width,
            minWidth: 200,
            maxWidth: 400,
          }}
        >
          {body}
        </Tooltip>
      )}
    </div>
  );
}
