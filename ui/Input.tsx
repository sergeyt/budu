import { forwardRef } from "react";
import {
  Input as ChakraInput,
  type InputProps as ChakraInputProps,
} from "@chakra-ui/react";
import { fieldControlDefaults } from "./fieldControl";

export type InputProps = ChakraInputProps;

export const Input = forwardRef<HTMLInputElement, InputProps>((props, ref) => {
  const {
    size = "md",
    borderRadius = fieldControlDefaults.borderRadius,
    borderColor = fieldControlDefaults.borderColor,
    color = fieldControlDefaults.color,
    _placeholder = fieldControlDefaults._placeholder,
    _focusVisible = fieldControlDefaults._focusVisible,
    ...rest
  } = props;
  return (
    <ChakraInput
      ref={ref}
      size={size}
      borderRadius={borderRadius}
      borderColor={borderColor}
      color={color}
      _placeholder={_placeholder}
      _focusVisible={_focusVisible}
      {...rest}
    />
  );
});

Input.displayName = "Input";
