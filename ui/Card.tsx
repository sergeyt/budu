"use client";

import React from "react";
import {
  Card as ChakraCard,
  type CardRootProps,
  type CardHeaderProps,
  type CardBodyProps,
  type CardFooterProps,
  type CardTitleProps,
  type CardDescriptionProps,
} from "@chakra-ui/react";

// ----------- ROOT -----------
const Root = React.forwardRef<HTMLDivElement, CardRootProps>(function CardRoot(
  {
    bg = "bg.surface",
    borderRadius = "lg",
    borderWidth = "1px",
    borderColor = "border.subtle",
    boxShadow = "shadow.card",
    ...rest
  },
  ref,
) {
  return (
    <ChakraCard.Root
      ref={ref}
      bg={bg}
      borderRadius={borderRadius}
      borderWidth={borderWidth}
      borderColor={borderColor}
      boxShadow={boxShadow}
      {...rest}
    />
  );
});

// ----------- HEADER -----------
const Header = React.forwardRef<HTMLDivElement, CardHeaderProps>(
  function CardHeader({ px = 4, pt = 4, pb = 0, ...rest }, ref) {
    return <ChakraCard.Header ref={ref} px={px} pt={pt} pb={pb} {...rest} />;
  },
);

// ----------- BODY -----------
const Body = React.forwardRef<HTMLDivElement, CardBodyProps>(function CardBody(
  { p = 4, ...rest },
  ref,
) {
  return <ChakraCard.Body ref={ref} p={p} {...rest} />;
});

// ----------- FOOTER -----------
const Footer = React.forwardRef<HTMLDivElement, CardFooterProps>(
  function CardFooter({ px = 4, pt = 4, pb = 4, ...rest }, ref) {
    return <ChakraCard.Footer ref={ref} px={px} pt={pt} pb={pb} {...rest} />;
  },
);

// ----------- TITLE -----------
const Title = React.forwardRef<HTMLHeadingElement, CardTitleProps>(
  function CardTitle(
    {
      color = "text.heading",
      fontWeight = "semibold",
      fontSize = "lg",
      ...rest
    },
    ref,
  ) {
    return (
      <ChakraCard.Title
        ref={ref}
        color={color}
        fontWeight={fontWeight}
        fontSize={fontSize}
        {...rest}
      />
    );
  },
);

// ----------- DESCRIPTION -----------
const Description = React.forwardRef<
  HTMLParagraphElement,
  CardDescriptionProps
>(function CardDescription(
  { color = "text.body", fontSize = "md", ...rest },
  ref,
) {
  return (
    <ChakraCard.Description
      ref={ref}
      color={color}
      fontSize={fontSize}
      {...rest}
    />
  );
});

// Export in Chakra-style namespace
export const Card = {
  Root,
  Header,
  Body,
  Footer,
  Title,
  Description,
};
