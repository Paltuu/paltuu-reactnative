import { TextInputProps, ViewStyle, TextStyle } from 'react-native';

export interface SearchBarProps extends TextInputProps {
  placeholder?: string;
  onSearch?: (text: string) => void;
  onClear?: () => void;
  style?: ViewStyle;
  renderLeadingIcons?: () => React.ReactNode;
  renderTrailingIcons?: () => React.ReactNode;
  onSearchDone?: () => void;
  onSearchMount?: () => void;
  containerWidth?: number;
  focusedWidth?: number;
  cancelButtonWidth?: number;
  enableWidthAnimation?: boolean;
  centerWhenUnfocused?: boolean;
  tint?: string;
  textCenterOffset?: number;
  iconCenterOffset?: number;
  iconStyle?: ViewStyle;
  inputStyle?: TextStyle;
}
