import React, { createContext, useCallback, useContext, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const ConfirmContext = createContext(null);

export function ConfirmProvider({ children }) {
  const [state, setState] = useState({
    open: false,
    title: "¿Confirmar?",
    description: "",
    confirmText: "Sí",
    cancelText: "No",
    variant: "default",
    resolve: null,
  });

  const confirm = useCallback(
    (opts = {}) =>
      new Promise((resolve) => {
        setState({
          open: true,
          title: opts.title || "¿Confirmar?",
          description: opts.description || "",
          confirmText: opts.confirmText || "Sí",
          cancelText: opts.cancelText || "No",
          variant: opts.variant || "default",
          resolve,
        });
      }),
    []
  );

  const close = (result) => {
    setState((s) => {
      if (s.resolve) s.resolve(result);
      return { ...s, open: false, resolve: null };
    });
  };

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      <Dialog open={state.open} onOpenChange={(o) => { if (!o) close(false); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{state.title}</DialogTitle>
            {state.description ? <DialogDescription>{state.description}</DialogDescription> : null}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)}>{state.cancelText}</Button>
            <Button
              onClick={() => close(true)}
              className={state.variant === "destructive" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-amber-500 hover:bg-amber-600 text-slate-900"}
            >
              {state.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </ConfirmContext.Provider>
  );
}

export function useConfirm() {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    return (opts) => Promise.resolve(window.confirm((opts && opts.title) || "¿Confirmar?"));
  }
  return ctx;
}