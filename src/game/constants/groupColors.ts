import type { PropertyGroup } from '../types/index';

/**
 * Màu sắc đại diện cho từng nhóm bất động sản.
 * Dùng chung cho toàn bộ UI: PlayerPanel, ActionDialog, BuildPanel, PropertyCard.
 */
export const GROUP_COLORS: Record<PropertyGroup, string> = {
  brown:      '#92400e',
  light_blue: '#0284c7',
  pink:       '#db2777',
  orange:     '#ea580c',
  red:        '#dc2626',
  yellow:     '#ca8a04',
  green:      '#16a34a',
  dark_blue:  '#1d4ed8',
};

/**
 * Nhãn tiếng Việt cho từng nhóm bất động sản.
 */
export const GROUP_LABELS: Record<PropertyGroup, string> = {
  brown:      'Nâu',
  light_blue: 'Xanh nhạt',
  pink:       'Hồng',
  orange:     'Cam',
  red:        'Đỏ',
  yellow:     'Vàng',
  green:      'Lục',
  dark_blue:  'Xanh đậm',
};
