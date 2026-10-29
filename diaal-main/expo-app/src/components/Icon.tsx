import React from 'react';
import { StyleProp, TextStyle } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

// Web uses Material Symbols names (snake_case); the native MaterialIcons font
// uses kebab-case. A generic conversion covers almost every icon.
const NAME_MAP: Record<string, string> = {
  grid_view: 'grid-view',
  home_work: 'home-work',
  near_me: 'near-me',
  calendar_today: 'calendar-today',
  pin_drop: 'pin-drop',
  square_foot: 'square-foot',
  chevron_right: 'chevron-right',
  chevron_left: 'chevron-left',
  arrow_forward: 'arrow-forward',
  arrow_back: 'arrow-back',
  chat_bubble: 'chat-bubble',
  location_on: 'location-on',
  location_searching: 'location-searching',
  add_circle: 'add-circle',
  notifications_off: 'notifications-off',
  verified_user: 'verified-user',
  photo_camera: 'photo-camera',
  add_a_photo: 'add-a-photo',
  attach_file: 'attach-file',
  attach_money: 'attach-money',
  check_circle: 'check-circle',
  arrow_forward_ios: 'arrow-forward-ios',
  receipt_long: 'receipt-long',
  support_agent: 'support-agent',
  flip_camera_android: 'flip-camera-android',
  close_fullscreen: 'close-fullscreen',
  expand_more: 'expand-more',
  swap_vert: 'swap-vert',
  volume_up: 'volume-up',
  local_offer: 'local-offer',
  account_balance: 'account-balance',
  trending_up: 'trending-up',
  dark_mode: 'dark-mode',
  light_mode: 'light-mode',
  notifications_active: 'notifications-active',
  mark_email_read: 'mark-email-read',
  done_all: 'done-all',
  more_vert: 'more-vert',
  more_horiz: 'more-horiz',
  radio_button_unchecked: 'radio-button-unchecked',
  radio_button_checked: 'radio-button-checked',
  open_in_new: 'open-in-new',
  north_east: 'north-east',
  visibility_off: 'visibility-off',
  videocam_off: 'videocam-off',
  mic_off: 'mic-off',
  phone_missed: 'phone-missed',
  call_end: 'call-end',
  directions_car: 'directions-car',
  privacy_tip: 'privacy-tip',
  content_copy: 'content-copy',
  upload_file: 'upload-file',
  picture_as_pdf: 'picture-as-pdf',
  download_for_offline: 'download-for-offline',
  error_outline: 'error-outline',
  check_circle_outline: 'check-circle-outline',
  person_add: 'person-add',
  local_shipping: 'local-shipping',
  gps_fixed: 'gps-fixed',
  my_location: 'my-location',
};

interface IconProps {
  name: string;
  size?: number;
  color?: string;
  style?: StyleProp<TextStyle>;
}

export const Icon: React.FC<IconProps> = ({ name, size = 20, color = '#404944', style }) => (
  <MaterialIcons
    name={(NAME_MAP[name] || name.replace(/_/g, '-')) as keyof typeof MaterialIcons.glyphMap}
    size={size}
    color={color}
    style={style}
  />
);
