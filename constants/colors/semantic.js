import { baseColors } from './base';

export const semanticColors = {
  text: {
    primary: baseColors.bodyInverted,
    secondary: baseColors.gray800,
    disabled: baseColors.gray400,
    error: baseColors.warning,
    tertiary: baseColors.tertiary,
  },

  bottomSheet: {
    backdrop: 'rgba(0, 0, 0, 0.5)',
    background: baseColors.gray900,
    handleIndicator: baseColors.gray400,
  },

  bg:{
    white: baseColors.white,
    black: baseColors.black,
    error: baseColors.warning,
    success: baseColors.success,
    info: baseColors.accent,
    grey: baseColors.gray800,
    greyAlpha: baseColors.gray800Alpha,
  },

  input: {
    bg: baseColors.background,
    text: baseColors.bodyInverted,
    textDisabled: baseColors.gray400,
    placeholder: baseColors.gray400,

    border: {
      normal: {
        color: baseColors.primary,
        width: 1,
      },
      focused: {
        color: baseColors.primary,
        width: 2,
      },
      error: {
        color: baseColors.warning,
        width: 2,
      },
      disabled: {
        color: baseColors.gray200,
        width: 1,
      },
    },
  },

  button: {
    primary: {
      normal: {
        bg: baseColors.primary,
        text: baseColors.accent,
        border: 'transparent',
      },
      pressed: {
        bg: baseColors.gray500,
        text: baseColors.black,
        border: 'transparent',
      },
      disabled: {
        bg: baseColors.gray500Alpha,
        text: baseColors.black,
        border: '#3f3f3fff',
      },
    },

    secondary: {
      normal: {
        bg: baseColors.gray800Alpha,
        text: baseColors.bodyInverted,
        border: baseColors.bodyInverted,
      },
      pressed: {
        bg: baseColors.white200Alpha,
        text: baseColors.bodyInverted,
        border: baseColors.bodyInverted,
      },
      disabled: {
        bg: 'transparent',
        text: baseColors.gray700,
        border: '#3A3A3A',
      },
    },

    ghost: {
      normal: {
        bg: 'transparent',
        text: baseColors.bodyInverted,
        border: 'transparent',
      },
      pressed: {
        bg: baseColors.gray500,
        text: baseColors.bodyInverted,
        border: 'transparent',
      },
      disabled: {
        bg: 'transparent',
        text: baseColors.gray700,
        border: 'transparent',
      },
    },

    // Destructive CTAs (delete account) — red so they can't be mistaken for Save.
    danger: {
      normal: {
        bg: baseColors.warning,
        text: baseColors.white,
        border: 'transparent',
      },
      pressed: {
        bg: baseColors.warning,
        text: baseColors.white,
        border: 'transparent',
      },
      disabled: {
        bg: baseColors.gray500Alpha,
        text: baseColors.black,
        border: '#3f3f3fff',
      },
    },

    bare: {
      normal: {
        bg: 'transparent',
        text: baseColors.bodyInverted,
        border: 'transparent',
      },
      pressed: {
        bg: 'transparent',
        text: baseColors.bodyInverted,
        border: 'transparent',
      },
      disabled: {
        bg: 'transparent',
        text: baseColors.gray700,
        border: 'transparent',
      },
    },
  },
};
