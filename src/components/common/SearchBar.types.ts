import { TextInputProps, ViewStyle, TextStyle } from 'react-native';

export interface SearchBarProps extends TextInputProps {
  placeholder?: string;
  /**
   * When provided, one of these strings is chosen at random (once, on mount)
   * as the idle placeholder (e.g. "Search users", "Search vets"). Falls back
   * to `placeholder` while focused or typing.
   */
  placeholders?: string[];
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
