/* eslint-disable @typescript-eslint/no-unused-vars -- props are destructured to keep them off the DOM */
import { createContext, useContext, useEffect, useState, type ComponentProps, type ReactNode } from "react";

/**
 * Light stand-in for `@/components/ui/popover`: Base UI's popover takes ~15 s to open under jsdom
 * (focus management walks the whole tree with CSS selectors). Opens on click, closes on Escape.
 */
const OpenContext = createContext<{ open: boolean; setOpen: (open: boolean) => void }>({ open: false, setOpen: () => {} });

export function Popover({ children, open: forced }: { children: ReactNode; open?: boolean }) {
  const [state, setOpen] = useState(false);
  const open = forced ?? state;
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);
  return <OpenContext.Provider value={{ open, setOpen }}>{children}</OpenContext.Provider>;
}

export function PopoverTrigger({
  onClick,
  openOnHover: _openOnHover,
  delay: _delay,
  ...props
}: ComponentProps<"button"> & { openOnHover?: boolean; delay?: number }) {
  const { open, setOpen } = useContext(OpenContext);
  return (
    <button
      type="button"
      aria-haspopup="dialog"
      aria-expanded={open}
      {...props}
      onClick={(event) => {
        onClick?.(event);
        setOpen(!open);
      }}
    />
  );
}

export function PopoverContent({
  align: _align,
  ...props
}: ComponentProps<"div"> & { align?: string }) {
  const { open } = useContext(OpenContext);
  return open ? <div role="dialog" {...props} /> : null;
}

export function PopoverTitle(props: ComponentProps<"h2">) {
  return <h2 {...props} />;
}

export const PopoverHeader = (props: ComponentProps<"div">) => <div {...props} />;
export const PopoverDescription = (props: ComponentProps<"p">) => <p {...props} />;
