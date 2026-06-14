"use client";

import * as React from "react";
import { type ListCollection, Select as ChakraSelect } from "@chakra-ui/react";

// Derive prop types from Chakra subcomponents
type SelectRootProps = Omit<
  React.ComponentPropsWithoutRef<typeof ChakraSelect.Root>,
  "collection"
> & {
  collection: ListCollection<{ value: string; label: string }>;
};
type SelectLabelProps = React.ComponentPropsWithoutRef<
  typeof ChakraSelect.Label
>;
type SelectControlProps = React.ComponentPropsWithoutRef<
  typeof ChakraSelect.Control
>;
type SelectTriggerProps = React.ComponentPropsWithoutRef<
  typeof ChakraSelect.Trigger
>;
type SelectValueTextProps = React.ComponentPropsWithoutRef<
  typeof ChakraSelect.ValueText
>;
type SelectIndicatorGroupProps = React.ComponentPropsWithoutRef<
  typeof ChakraSelect.IndicatorGroup
>;
type SelectIndicatorProps = React.ComponentPropsWithoutRef<
  typeof ChakraSelect.Indicator
>;
type SelectClearTriggerProps = React.ComponentPropsWithoutRef<
  typeof ChakraSelect.ClearTrigger
>;
type SelectPositionerProps = React.ComponentPropsWithoutRef<
  typeof ChakraSelect.Positioner
>;
type SelectContentProps = React.ComponentPropsWithoutRef<
  typeof ChakraSelect.Content
>;
type SelectItemProps = React.ComponentPropsWithoutRef<typeof ChakraSelect.Item>;
type SelectItemGroupProps = React.ComponentPropsWithoutRef<
  typeof ChakraSelect.ItemGroup
>;
type SelectItemGroupLabelProps = React.ComponentPropsWithoutRef<
  typeof ChakraSelect.ItemGroupLabel
>;
type SelectHiddenSelectProps = React.ComponentPropsWithoutRef<
  typeof ChakraSelect.HiddenSelect
>;
type SelectItemIndicatorProps = React.ComponentPropsWithoutRef<
  typeof ChakraSelect.ItemIndicator
>;

// ---------- ROOT ----------
const Root = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.Root>,
  SelectRootProps
>(function SelectRoot(
  {
    size = "md",
    variant = "outline",
    colorPalette = "gray",
    width = "100%",
    ...rest
  },
  ref,
) {
  return (
    <ChakraSelect.Root
      ref={ref}
      size={size}
      variant={variant}
      colorPalette={colorPalette}
      width={width}
      {...rest}
    />
  );
});

// ---------- HIDDEN SELECT ----------
const HiddenSelect = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.HiddenSelect>,
  SelectHiddenSelectProps
>(function SelectHiddenSelect(props, ref) {
  return <ChakraSelect.HiddenSelect ref={ref} {...props} />;
});

// ---------- LABEL ----------
const Label = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.Label>,
  SelectLabelProps
>(function SelectLabel(
  { color = "text.muted", fontSize = "sm", mb = 1, ...rest },
  ref,
) {
  return (
    <ChakraSelect.Label
      ref={ref}
      color={color}
      fontSize={fontSize}
      mb={mb}
      {...rest}
    />
  );
});

// ---------- CONTROL ----------
const Control = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.Control>,
  SelectControlProps
>(function SelectControl({ borderRadius = "lg", ...rest }, ref) {
  return (
    <ChakraSelect.Control ref={ref} borderRadius={borderRadius} {...rest} />
  );
});

// ---------- TRIGGER ----------
const Trigger = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.Trigger>,
  SelectTriggerProps
>(function SelectTrigger(
  {
    borderRadius = "lg",
    fontSize = "sm",
    _focusVisible = { boxShadow: "shadow.focus" },
    ...rest
  },
  ref,
) {
  return (
    <ChakraSelect.Trigger
      ref={ref}
      borderRadius={borderRadius}
      fontSize={fontSize}
      _focusVisible={_focusVisible}
      {...rest}
    />
  );
});

// ---------- VALUE TEXT ----------
const ValueText = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.ValueText>,
  SelectValueTextProps
>(function SelectValueText({ color = "text.body", ...rest }, ref) {
  return <ChakraSelect.ValueText ref={ref} color={color} {...rest} />;
});

// ---------- INDICATOR GROUP ----------
const IndicatorGroup = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.IndicatorGroup>,
  SelectIndicatorGroupProps
>(function SelectIndicatorGroup(props, ref) {
  return <ChakraSelect.IndicatorGroup ref={ref} {...props} />;
});

// ---------- INDICATOR ----------
const Indicator = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.Indicator>,
  SelectIndicatorProps
>(function SelectIndicator(props, ref) {
  return <ChakraSelect.Indicator ref={ref} {...props} />;
});

// ---------- CLEAR TRIGGER ----------
const ClearTrigger = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.ClearTrigger>,
  SelectClearTriggerProps
>(function SelectClearTrigger(props, ref) {
  return <ChakraSelect.ClearTrigger ref={ref} {...props} />;
});

// ---------- POSITIONER ----------
const Positioner = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.Positioner>,
  SelectPositionerProps
>(function SelectPositioner(props, ref) {
  return <ChakraSelect.Positioner ref={ref} {...props} />;
});

// ---------- CONTENT (dropdown panel) ----------
const Content = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.Content>,
  SelectContentProps
>(function SelectContent(
  {
    bg = "bg.surface",
    borderRadius = "lg",
    borderWidth = "1px",
    borderColor = "border.subtle",
    boxShadow = "shadow.popover",
    py = 1,
    zIndex = "dropdown",
    ...rest
  },
  ref,
) {
  return (
    <ChakraSelect.Content
      ref={ref}
      bg={bg}
      borderRadius={borderRadius}
      borderWidth={borderWidth}
      borderColor={borderColor}
      boxShadow={boxShadow}
      py={py}
      zIndex={zIndex}
      {...rest}
    />
  );
});

// ---------- ITEM ----------
const Item = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.Item>,
  SelectItemProps
>(function SelectItem(
  {
    fontSize = "sm",
    px = 3,
    py = 2,
    cursor = "pointer",
    _hover = { bg: "bg.subtle" },
    _highlighted = {
      bg: "brand.muted",
      color: "text.heading",
    },
    _selected = {
      bg: "brand.muted",
      color: "text.heading",
    },
    ...rest
  },
  ref,
) {
  return (
    <ChakraSelect.Item
      ref={ref}
      fontSize={fontSize}
      px={px}
      py={py}
      cursor={cursor}
      _hover={_hover}
      _highlighted={_highlighted}
      _selected={_selected}
      {...rest}
    />
  );
});

// ---------- ITEM INDICATOR ----------
const ItemIndicator = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.ItemIndicator>,
  SelectItemIndicatorProps
>(function SelectItemIndicator(props, ref) {
  return <ChakraSelect.ItemIndicator ref={ref} {...props} />;
});

// ---------- ITEM GROUP ----------
const ItemGroup = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.ItemGroup>,
  SelectItemGroupProps
>(function SelectItemGroup({ mt = 1, mb = 1, ...rest }, ref) {
  return <ChakraSelect.ItemGroup ref={ref} mt={mt} mb={mb} {...rest} />;
});

// ---------- ITEM GROUP LABEL ----------
const ItemGroupLabel = React.forwardRef<
  React.ComponentRef<typeof ChakraSelect.ItemGroupLabel>,
  SelectItemGroupLabelProps
>(function SelectItemGroupLabel(
  {
    fontSize = "xs",
    textTransform = "uppercase",
    color = "text.muted",
    px = 3,
    py = 1,
    ...rest
  },
  ref,
) {
  return (
    <ChakraSelect.ItemGroupLabel
      ref={ref}
      fontSize={fontSize}
      textTransform={textTransform}
      color={color}
      px={px}
      py={py}
      {...rest}
    />
  );
});

// ---------- EXPORT NAMESPACE ----------
export const Select = {
  Root,
  HiddenSelect,
  Label,
  Control,
  Trigger,
  ValueText,
  IndicatorGroup,
  Indicator,
  ClearTrigger,
  Positioner,
  Content,
  Item,
  ItemIndicator,
  ItemGroup,
  ItemGroupLabel,
};
