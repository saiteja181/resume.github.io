import * as React from 'react';
import { MenuButtonProps } from '../../../MenuButton.types';
import BaseButton from './BaseButton';
import skinsStyle from './styles/TextSeparatorsMenuButtonNSkin.scss';

const TextSeparatorsMenuButtonNSkin: React.FC<MenuButtonProps> = props => {
  return (
    <BaseButton
      {...props}
      skinsStyle={skinsStyle}
      skin="TextSeparatorsMenuButtonNSkin"
    />
  );
};

export default TextSeparatorsMenuButtonNSkin;
