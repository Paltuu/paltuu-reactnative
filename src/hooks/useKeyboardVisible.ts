import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

// iOS fires `keyboardWillShow`/`Hide` ahead of the animation (so UI can
// resize in sync with it); Android only has `keyboardDidShow`/`Hide`.
const SHOW_EVENT = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
const HIDE_EVENT = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

/** Whether the software keyboard is currently visible. */
export function useKeyboardVisible(): boolean {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showSub = Keyboard.addListener(SHOW_EVENT, () => setVisible(true));
    const hideSub = Keyboard.addListener(HIDE_EVENT, () => setVisible(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  return visible;
}
