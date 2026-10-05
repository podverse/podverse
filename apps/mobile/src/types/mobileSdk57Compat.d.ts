declare module "@expo/vector-icons" {
  type IconProps = import("react-native").TextProps & {
    color?: string;
    name: string;
    size?: number;
    solid?: boolean;
  };

  export const FontAwesome6: import("react").ComponentType<IconProps>;
  export const Ionicons: import("react").ComponentType<IconProps>;
}
