import * as React from 'react';
import type {
  IDropDownMenuProps,
  IDropDownMenuImperativeActions,
} from '../../../DropDownMenu.types';
import DropDownMenuBase from '../../DropDownMenuBase';
import MenuButton from '../../../../MenuButton/viewer/skinComps/BaseButton/TextSeparatorsMenuButtonNSkin';
import styles from './TextSeparatorsMenuButtonSkin.scss';

const TextSeparatorsMenuButtonSkin: React.ForwardRefRenderFunction<
  IDropDownMenuImperativeActions,
  IDropDownMenuProps
> = (props, ref) => {
  return (
    <DropDownMenuBase
      {...props}
      ref={ref}
      styles={styles}
      Button={MenuButton}
    />
  );
};

export default React.forwardRef(TextSeparatorsMenuButtonSkin);
