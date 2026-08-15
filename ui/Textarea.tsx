import { forwardRef } from "react";
import {
  Textarea as ChakraTextarea,
  type TextareaProps as ChakraTextareaProps,
} from "@chakra-ui/react";
import { fieldControlDefaults } from "./fieldControl";

export type TextareaProps = ChakraTextareaProps;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (props, ref) => {
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
      <ChakraTextarea
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
  },
);

Textarea.displayName = "Textarea";
