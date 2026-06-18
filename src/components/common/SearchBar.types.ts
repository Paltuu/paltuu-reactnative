import { TextInputProps, ViewStyle, TextStyle } from 'react-native';

export interface SearchBarProps extends TextInputProps {
  placeholder?: string;
  /**
   * When provided, the idle placeholder cycles through these strings with a
   * staggered per-character animation (e.g. "Search users", "Search vets").
   * Falls back to `placeholder` while focused or typing.
   */
  placeholders?: string[];
  /** Time in ms each cycling placeholder is shown. Defaults to 3000. */
  placeholderInterval?: number;
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
