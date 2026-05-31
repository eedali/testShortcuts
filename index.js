(function() {
  "use strict";
  const { React, useAppStore, KoBarExtensions, api } = window;
  const { useState, useEffect, useRef, useMemo, useLayoutEffect } = React;
  const PLUGIN_ID = "com.kobar.testshortcuts";
  const TestShortcutsPanel = ({ onClose, anchorRect }) => {
    const [pinnedApps, setPinnedApps] = useState(() => {
      try {
        const data = localStorage.getItem("kobar-plugin-shortcuts-data");
        return data ? JSON.parse(data) : [];
      } catch (err) {
        return [];
      }
    });
    useEffect(() => {
      localStorage.setItem("kobar-plugin-shortcuts-data", JSON.stringify(pinnedApps));
    }, [pinnedApps]);
    const pinApp = (app) => setPinnedApps((prev) => [...prev, app]);
    const unpinApp = (id) => setPinnedApps((prev) => prev.filter((a) => a.id !== id));
    const reorderPinnedApps = (fromIndex, toIndex) => {
      setPinnedApps((prev) => {
        const arr = [...prev];
        const [moved] = arr.splice(fromIndex, 1);
        arr.splice(toIndex, 0, moved);
        return arr;
      });
    };
    const updateAppTag = (id, tag) => {
      setPinnedApps((prev) => prev.map((a) => a.id === id ? { ...a, tag } : a));
    };
    const edgePosition = useAppStore((state) => state.edgePosition);
    const orientation = useAppStore((state) => state.orientation);
    const screenBounds = useAppStore((state) => state.screenBounds) || { height: 800 };
    const sidebarPosition = useAppStore((state) => state.sidebarPosition);
    const design = useAppStore((state) => state.design);
    const isMac = useAppStore((state) => state.isMac);
    const glassOpacity = useAppStore((state) => state.glassOpacity);
    const iconScale = useAppStore((state) => state.iconScale) || 1;
    const [deletingId, setDeletingId] = useState(null);
    const [editingTagId, setEditingTagId] = useState(null);
    const [tagInputVal, setTagInputVal] = useState("");
    const [draggedItemIndex, setDraggedItemIndex] = useState(null);
    const [dragEnabled, setDragEnabled] = useState(false);
    const [failedImageIds, setFailedImageIds] = useState({});
    const deleteTimeoutRef = useRef(null);
    useRef({});
    const handleDragStart = (e, index) => {
      setDraggedItemIndex(index);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", index.toString());
    };
    const handleDragEnter = (e, index) => {
      e.preventDefault();
      if (draggedItemIndex !== null && draggedItemIndex !== index) {
        reorderPinnedApps(draggedItemIndex, index);
        setDraggedItemIndex(index);
      }
    };
    const handleDragEnd = () => {
      setDraggedItemIndex(null);
      setDragEnabled(false);
    };
    useEffect(() => {
      const handleDocClick = (e) => {
        if (!e.target.closest(".shortcut-card-plugin")) {
          setDeletingId(null);
        }
      };
      document.addEventListener("mousedown", handleDocClick);
      return () => document.removeEventListener("mousedown", handleDocClick);
    }, []);
    const handleDrop = async (e) => {
      e.preventDefault();
      if (draggedItemIndex !== null) return;
      let filePath = "";
      let name = "";
      let iconDataUrl = "";
      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        const file = files[0];
        filePath = api?.getFilePath ? api.getFilePath(file) : file.path;
        if (!filePath) return;
        iconDataUrl = api?.getFileIcon && await api.getFileIcon(filePath) || "";
        name = file.name.replace(/\.[^/.]+$/, "");
      } else {
        let url = e.dataTransfer.getData("text/uri-list") || e.dataTransfer.getData("URL");
        if (!url) {
          const text = e.dataTransfer.getData("text/plain");
          if (text && (text.startsWith("http://") || text.startsWith("https://"))) url = text.trim();
        }
        if (!url) return;
        filePath = url.trim();
        try {
          const parsedUrl = new URL(filePath);
          name = parsedUrl.hostname.replace("www.", "");
          if (!name) name = parsedUrl.pathname.split("/").filter(Boolean).pop() || filePath;
          iconDataUrl = `https://t3.gstatic.com/faviconV2?client=SOCIAL&type=FAVICON&fallback_opts=TYPE,SIZE,URL&url=${encodeURIComponent(filePath)}&size=64`;
        } catch (err) {
          name = filePath;
        }
      }
      if (filePath) {
        pinApp({ id: Date.now().toString(), name, path: filePath, icon: iconDataUrl });
      }
    };
    const popupHeight = 220;
    const popupWidth = 320;
    const getPopupStyle = () => {
      const style = {
        position: "absolute",
        zIndex: 99999,
        width: `${popupWidth}px`,
        maxHeight: "400px",
        backgroundColor: design === "style2" ? `color-mix(in srgb, var(--theme-surface) ${glassOpacity}%, transparent)` : "var(--theme-surface)",
        borderColor: design === "style2" ? "rgba(255, 255, 255, 0.1)" : "var(--theme-border)",
        backdropFilter: design === "style2" ? isMac ? "blur(8px)" : "blur(20px)" : "none",
        WebkitBackdropFilter: design === "style2" ? isMac ? "blur(8px)" : "blur(20px)" : "none"
      };
      const offsetTop = sidebarPosition ? sidebarPosition.y : 0;
      if (orientation === "horizontal") {
        style.left = "50%";
        style.transform = "translateX(-50%)";
        if (edgePosition === "top") {
          style.top = "100%";
          style.marginTop = "12px";
        } else {
          style.bottom = "100%";
          style.marginBottom = "12px";
        }
      } else {
        let topPos = anchorRect ? anchorRect.top - offsetTop - 20 : 0;
        if (topPos + popupHeight > screenBounds.height) topPos = screenBounds.height - popupHeight - 20;
        if (topPos < 20) topPos = 20;
        style.top = `${topPos}px`;
        if (edgePosition === "left") {
          style.left = "100%";
          style.marginLeft = "12px";
        } else {
          style.right = "100%";
          style.marginRight = "12px";
        }
      }
      return style;
    };
    return /* @__PURE__ */ window.React.createElement(
      "div",
      {
        className: "border shadow-2xl pointer-events-auto animate-in fade-in zoom-in duration-200 overflow-hidden flex flex-col rounded-xl",
        style: getPopupStyle()
      },
      /* @__PURE__ */ window.React.createElement("div", { className: "flex justify-between items-center p-4 pb-3 bg-white/5 border-b border-white/10" }, /* @__PURE__ */ window.React.createElement("div", { className: "flex items-center gap-2 drag-region w-full" }, /* @__PURE__ */ window.React.createElement("span", { className: "material-symbols-outlined text-[16px] text-primary" }, "apps"), /* @__PURE__ */ window.React.createElement("span", { className: "text-[10px] uppercase tracking-wider text-slate-300 font-bold" }, "Plugin Shortcuts")), /* @__PURE__ */ window.React.createElement(
        "button",
        {
          onClick: onClose,
          className: "w-6 h-6 rounded-lg bg-white/5 text-slate-400 hover:text-white hover:bg-red-500/20 flex items-center justify-center transition-all no-drag-region"
        },
        /* @__PURE__ */ window.React.createElement("span", { className: "material-symbols-outlined text-[16px]" }, "close")
      )),
      /* @__PURE__ */ window.React.createElement(
        "div",
        {
          className: "flex-1 p-4 flex flex-wrap gap-3 justify-center content-start max-h-80 overflow-y-auto custom-scrollbar",
          onDragOver: (e) => e.preventDefault(),
          onDrop: handleDrop
        },
        pinnedApps.map((app, index) => {
          const isWebUrlIcon = app.icon && (app.icon.startsWith("http://") || app.icon.startsWith("https://"));
          const isGenericOrEmpty = failedImageIds[app.id] || !isWebUrlIcon && (!app.icon || app.icon === "" || app.icon.length < 3e3);
          let finalName = app.name || "??";
          let cleanName = finalName.replace(/[^a-zA-Z0-9]/g, "") || finalName;
          const appInitials = cleanName.substring(0, 2).toUpperCase();
          return /* @__PURE__ */ window.React.createElement(
            "div",
            {
              key: app.id,
              draggable: dragEnabled,
              onDragStart: (e) => handleDragStart(e, index),
              onDragEnter: (e) => handleDragEnter(e, index),
              onDragEnd: handleDragEnd,
              onDragOver: (e) => e.preventDefault(),
              onMouseDown: (e) => {
                if (e.shiftKey) setDragEnabled(true);
              },
              onMouseUp: () => setDragEnabled(false),
              className: `shortcut-card-plugin group relative animate-in fade-in transition-all ${draggedItemIndex === index ? "opacity-40 scale-95 border-dashed border-2 border-primary/50 rounded-xl" : ""}`,
              style: { width: 64 * iconScale, height: 64 * iconScale }
            },
            editingTagId === app.id ? /* @__PURE__ */ window.React.createElement(
              "div",
              {
                className: "w-full h-full rounded-xl border flex flex-col items-center justify-center bg-[#1e1b17] border-primary",
                style: { padding: `${4 * iconScale}px` },
                onMouseDown: (e) => e.stopPropagation()
              },
              /* @__PURE__ */ window.React.createElement(
                "input",
                {
                  type: "text",
                  value: tagInputVal,
                  onChange: (e) => setTagInputVal(e.target.value),
                  placeholder: "Tag...",
                  maxLength: 10,
                  autoFocus: true,
                  onKeyDown: (e) => {
                    if (e.key === "Enter") {
                      updateAppTag(app.id, tagInputVal);
                      setEditingTagId(null);
                    } else if (e.key === "Escape") {
                      setEditingTagId(null);
                    }
                  },
                  onBlur: () => {
                    updateAppTag(app.id, tagInputVal);
                    setEditingTagId(null);
                  },
                  className: "w-full bg-white/5 border border-white/10 rounded text-center text-white focus:outline-none focus:border-primary no-drag-region",
                  style: { fontSize: `${Math.max(8, 10 * iconScale)}px`, padding: `${2 * iconScale}px ${4 * iconScale}px` }
                }
              ),
              /* @__PURE__ */ window.React.createElement("span", { className: "text-slate-500 mt-1 pointer-events-none", style: { fontSize: `${Math.max(6, 7 * iconScale)}px` } }, "Enter to save")
            ) : /* @__PURE__ */ window.React.createElement(
              "div",
              {
                className: `w-full h-full rounded-xl border flex items-center justify-center overflow-hidden transition-all hover:scale-105 active:scale-95 shadow-lg cursor-pointer ${design === "style2" ? "bg-transparent" : "bg-[#1e1b17]"}`,
                style: { borderColor: design === "style2" ? "rgba(255,255,255,0.1)" : "var(--theme-border)" },
                onMouseDown: (e) => {
                  if (e.shiftKey) return;
                  deleteTimeoutRef.current = setTimeout(() => setDeletingId(app.id), 600);
                },
                onMouseUp: () => {
                  if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
                },
                onMouseLeave: () => {
                  if (deleteTimeoutRef.current) clearTimeout(deleteTimeoutRef.current);
                },
                onClick: (e) => {
                  e.stopPropagation();
                  if (e.shiftKey) return;
                  if (deletingId !== app.id && app.path && api?.launchFile) {
                    api.launchFile(app.path);
                  }
                },
                title: app.tag ? `[${app.tag}] ${app.name}` : app.name
              },
              isGenericOrEmpty ? /* @__PURE__ */ window.React.createElement("div", { className: "w-full h-full flex items-center justify-center font-bold text-primary/70", style: { fontSize: `${Math.max(10, 12 * iconScale)}px` } }, appInitials) : /* @__PURE__ */ window.React.createElement(
                "img",
                {
                  src: app.icon,
                  className: "w-full h-full object-contain pointer-events-none",
                  style: { padding: `${12 * iconScale}px` },
                  alt: app.name,
                  draggable: false,
                  onError: () => setFailedImageIds((prev) => ({ ...prev, [app.id]: true }))
                }
              )
            ),
            editingTagId !== app.id && app.tag && /* @__PURE__ */ window.React.createElement("span", { className: "absolute bottom-0 right-0 font-bold rounded-tl-lg rounded-br-xl uppercase tracking-wider pointer-events-none select-none z-20", style: { backgroundColor: "var(--theme-primary)", fontSize: `${Math.max(6, 8 * iconScale)}px`, padding: `${2 * iconScale}px ${4 * iconScale}px` } }, app.tag),
            deletingId === app.id && /* @__PURE__ */ window.React.createElement(window.React.Fragment, null, /* @__PURE__ */ window.React.createElement(
              "button",
              {
                onMouseDown: (e) => e.stopPropagation(),
                onClick: (e) => {
                  e.stopPropagation();
                  unpinApp(app.id);
                  setDeletingId(null);
                },
                className: "absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-white flex items-center justify-center shadow-lg hover:bg-red-600 z-10 cursor-pointer",
                title: "Delete Shortcut"
              },
              /* @__PURE__ */ window.React.createElement("span", { className: "material-symbols-outlined text-[12px]" }, "close")
            ), /* @__PURE__ */ window.React.createElement(
              "button",
              {
                onMouseDown: (e) => e.stopPropagation(),
                onClick: (e) => {
                  e.stopPropagation();
                  setEditingTagId(app.id);
                  setTagInputVal(app.tag || "");
                  setDeletingId(null);
                },
                className: "absolute -top-1 -left-1 w-5 h-5 bg-black/60 hover:bg-black/80 text-slate-300 hover:text-white rounded-full border border-white/10 flex items-center justify-center shadow-lg z-10 cursor-pointer transition-colors",
                title: "Edit Tag"
              },
              /* @__PURE__ */ window.React.createElement("span", { className: "material-symbols-outlined text-[12px]" }, "label")
            ))
          );
        }),
        /* @__PURE__ */ window.React.createElement(
          "div",
          {
            className: "rounded-xl border-2 border-dashed flex flex-col items-center justify-center text-slate-500 hover:text-primary hover:border-primary transition-all cursor-default bg-white/5 p-1",
            style: { borderColor: "var(--theme-border)", width: 64 * iconScale, height: 64 * iconScale }
          },
          /* @__PURE__ */ window.React.createElement("span", { className: "font-bold text-center leading-tight pointer-events-none", style: { fontSize: `${Math.max(8, 10 * iconScale)}px` } }, "Drop an URL or file")
        )
      )
    );
  };
  KoBarExtensions.registerSidebarButton({
    id: PLUGIN_ID,
    icon: "apps",
    label: "Test Shortcuts",
    onClick: (e, anchorRect) => {
      const state = useAppStore.getState();
      if (state.activeExtensionPanelId === PLUGIN_ID) {
        useAppStore.setState({ activeExtensionPanelId: null });
      } else {
        useAppStore.setState({
          activeExtensionAnchorRect: anchorRect,
          activeExtensionPanelId: PLUGIN_ID
        });
      }
    }
  });
  KoBarExtensions.registerPanel(PLUGIN_ID, {
    id: PLUGIN_ID,
    render: (props) => React.createElement(TestShortcutsPanel, props)
  });
})();
