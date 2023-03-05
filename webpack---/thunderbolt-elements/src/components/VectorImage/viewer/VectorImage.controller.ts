import { withCompController } from '@wix/editor-elements-integrations';
import {
  IVectorImageMapperProps,
  IVectorImageControllerProps,
  IVectorImageProps,
  IVectorImageStateRefs,
} from '../VectorImage.types';

const compController = withCompController<
  IVectorImageMapperProps,
  IVectorImageControllerProps,
  IVectorImageProps,
  IVectorImageStateRefs
>(({ stateValues, mapperProps }) => {
  const { onClick } = mapperProps;
  const { toggle } = stateValues;
  if (toggle) {
    return {
      ...mapperProps,
      onClick: e => {
        onClick?.(e);
        toggle(false);
      },
      onKeyDown: keyboardEvent => {
        if (keyboardEvent.key === 'Enter' || keyboardEvent.key === ' ') {
          toggle(false);
        }
      },
    };
  }
  return mapperProps;
});

export default compController;
