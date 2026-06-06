"use client";

import React, { useState } from "react";
import Link from "next/link";

interface PuzzleGroup {
  name: string;
  image: string;
  clue: string;
  rows: number;
  cols: number;
  solved: boolean;
}

interface ConfigData {
  group1: PuzzleGroup;
  group2: PuzzleGroup;
  group3: PuzzleGroup;
  group4: PuzzleGroup;
}

// Search algorithm to find rows & cols in range [45, 52] matching aspect ratio
function calculateGridSize(width: number, height: number): { rows: number; cols: number } {
  const aspect = width / height;
  let bestRows = 6;
  let bestCols = 8;
  let minDiff = Infinity;

  // Search through reasonable rows and columns to find best aspect fit
  for (let r = 3; r <= 15; r++) {
    for (let c = 3; c <= 15; c++) {
      const product = r * c;
      if (product >= 45 && product <= 52) {
        const ratio = c / r;
        const diff = Math.abs(ratio - aspect);
        if (diff < minDiff) {
          minDiff = diff;
          bestRows = r;
          bestCols = c;
        }
      }
    }
  }

  return { rows: bestRows, cols: bestCols };
}

export default function AdminPortal() {
  const [formData, setFormData] = useState<ConfigData | null>(null);
  const [authorized, setAuthorized] = useState<boolean>(false);
  const [saving, setSaving] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [passwordInput, setPasswordInput] = useState("");

  const handleChange = <K extends keyof PuzzleGroup>(
    groupKey: keyof ConfigData,
    field: K,
    value: PuzzleGroup[K]
  ) => {
    if (!formData) return;
    setFormData({
      ...formData,
      [groupKey]: {
        ...formData[groupKey],
        [field]: value,
      },
    });
  };

  const handleFileUpload = (
    groupKey: keyof ConfigData,
    file: File | null
  ) => {
    if (!formData || !file) return;

    // Validate file size (max 500KB)
    const maxSizeKB = 500;
    if (file.size > maxSizeKB * 1024) {
      showToast(`❌ Image too large! Max ${maxSizeKB}KB, got ${(file.size / 1024).toFixed(0)}KB`);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setFormData({
          ...formData,
          [groupKey]: {
            ...formData[groupKey],
            image: result,
          },
        });
        showToast(`✓ Image loaded (${(file.size / 1024).toFixed(0)}KB)`);
      }
    };
    reader.onerror = () => {
      showToast("❌ Failed to read image file");
    };
    reader.readAsDataURL(file);
  };

  const showToast = (message: string) => {
    setToastMessage(message);
    setTimeout(() => {
      setToastMessage(null);
    }, 3000);
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const expected = process.env.NEXT_PUBLIC_ADMIN_PASSWORD || "";
    if (passwordInput === expected) {
      setAuthorized(true);
      // Load config after authentication
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          setFormData(data);
        }
      } catch (err) {
        console.error("Failed to load configuration", err);
      }
    } else {
      showToast("❌ Incorrect password");
      setPasswordInput("");
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData) return;

    setSaving(true);
    try {
      const payload = JSON.stringify(formData);
      const sizeKB = payload.length / 1024;
      
      if (sizeKB > 5000) {
        showToast(`⚠️ Large payload (${sizeKB.toFixed(0)}KB). Images may be too big.`);
      }

      const res = await fetch("/api/config", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: payload,
      });

      if (res.ok) {
        const data = await res.json();
        showToast("✓ Configurations saved successfully!");
        // Update local state with returned config to confirm save
        setFormData(data.config);
      } else {
        const errText = await res.text();
        let errMsg = "Failed to save configurations";
        try {
          const errData = JSON.parse(errText);
          errMsg = errData.error || errMsg;
        } catch {
          errMsg = errText || errMsg;
        }
        showToast(`❌ Error: ${errMsg}`);
      }
    } catch (err) {
      console.error("Failed to save configuration", err);
      const errMsg = err instanceof Error ? err.message : "Network error";
      showToast(`❌ Error: ${errMsg}`);
    } finally {
      setSaving(false);
    }
  };

  if (authorized !== true) {
    return (
      <>
        <header className="navbar">
          <Link href="/" className="nav-logo">
            Puzzel Hub
          </Link>
        </header>
        <div className="admin-container" style={{ justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
          <form onSubmit={handlePasswordSubmit} style={{ width: "100%", maxWidth: "400px", textAlign: "center" }}>
            <h2 className="puzzle-title">Admin Access</h2>
            <p className="puzzle-subtitle" style={{ marginBottom: "1.5rem" }}>Enter admin password to continue</p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              placeholder="Admin Password"
              style={{
                width: "100%",
                padding: "0.75rem",
                marginBottom: "1rem",
                borderRadius: "8px",
                border: "2px solid var(--color-primary, #1a73e8)",
                fontSize: "1rem",
                boxSizing: "border-box"
              }}
              autoFocus
            />
            <button type="submit" className="btn-primary" style={{ width: "100%" }}>
              Unlock Admin Panel
            </button>
          </form>
          {toastMessage && (
            <div className="toast-notification" style={{ marginTop: "1rem" }}>
              {toastMessage}
            </div>
          )}
        </div>
      </>
    );
  }

  if (!formData) {
    return (
      <div className="admin-container" style={{ justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <h2 className="puzzle-title">Configuration Unavailable</h2>
        <p className="puzzle-subtitle">Could not communicate with the config API. Check console logs.</p>
        <Link href="/" className="btn-secondary" style={{ marginTop: "1rem" }}>
          Return Home
        </Link>
      </div>
    );
  }

  const groupKeys: (keyof ConfigData)[] = ["group1", "group2", "group3", "group4"];

  return (
    <>
      <header className="navbar">
        <Link href="/" className="nav-logo">
          Puzzel Hub
        </Link>
        <div className="nav-links">
          <Link href="/" className="btn-secondary">
            ← Main Board
          </Link>
        </div>
      </header>

      <main className="admin-container">
        {toastMessage && (
          <div className="toast-notification">
            {toastMessage}
          </div>
        )}

        <div className="admin-header">
          <div>
            <h1 className="admin-title">Admin Puzzle Panel</h1>
            <p className="puzzle-subtitle" style={{ fontSize: "1rem" }}>
              Configure images, labels, and clues. You can also revoke solved statuses to lock the puzzles again for players.
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="admin-form">
          <div className="admin-grid">
            {groupKeys.map((key) => {
              const group = formData[key];
              return (
                <div key={key} className="admin-card">
                  <div className="admin-card-title">
                    <span>{key.toUpperCase()} Settings</span>
                    <span style={{ fontSize: "0.8rem", color: "var(--text-muted)", textTransform: "none" }}>
                      Active
                    </span>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Group Name Label</label>
                    <input
                      type="text"
                      className="form-input"
                      value={group.name}
                      onChange={(e) => handleChange(key, "name", e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Image Source URL</label>
                    <input
                      type="url"
                      className="form-input"
                      value={group.image.startsWith("data:") ? "" : group.image}
                      onChange={(e) => handleChange(key, "image", e.target.value)}
                      placeholder="https://images.unsplash.com/..."
                    />
                    <small style={{ color: "var(--text-muted)", marginTop: "0.4rem", display: "block" }}>
                      Keep using an image URL, or upload one from your gallery below.
                    </small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Upload Image from Gallery</label>
                    <input
                      type="file"
                      accept="image/*"
                      className="form-input"
                      onChange={(e) => handleFileUpload(key, e.target.files?.[0] ?? null)}
                    />
                    <small style={{ color: "var(--text-muted)", marginTop: "0.4rem", display: "block" }}>
                      A picked local image is stored as a previewable image and will override the URL field.
                    </small>
                  </div>

                  <div className="form-group">
                    <label className="form-label">Live Image Preview & Aspect Calculation</label>
                    {group.image ? (
                      <img
                        src={group.image}
                        alt="Preview"
                        className="image-preview-box animate-fade-in"
                        style={{ objectFit: "cover" }}
                        onLoad={(e) => {
                          const img = e.currentTarget;
                          const width = img.naturalWidth;
                          const height = img.naturalHeight;
                          if (width && height) {
                            const { rows, cols } = calculateGridSize(width, height);
                            if (group.rows !== rows || group.cols !== cols) {
                              setFormData((prev) => {
                                if (!prev) return null;
                                return {
                                  ...prev,
                                  [key]: {
                                    ...prev[key],
                                    rows,
                                    cols,
                                  },
                                };
                              });
                            }
                          }
                        }}
                        onError={() => {
                          // Silent check for incomplete typing URL
                        }}
                      />
                    ) : (
                      <div className="image-preview-box">
                        No Image URL specified
                      </div>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Puzzle Grid Configuration (45-52 pieces)</label>
                    <div style={{ 
                      fontFamily: "var(--font-mono)", 
                      fontSize: "0.85rem", 
                      color: "var(--accent-cyan)", 
                      backgroundColor: "rgba(0,0,0,0.2)", 
                      padding: "0.5rem 0.75rem", 
                      borderRadius: "6px" 
                    }}>
                      📐 {group.rows} rows × {group.cols} cols = {group.rows * group.cols} pieces
                      <span style={{ color: "var(--text-muted)", marginLeft: "0.5rem" }}>
                        ({(group.cols / group.rows).toFixed(2)} ratio, {group.cols > group.rows ? "Landscape" : group.cols < group.rows ? "Portrait" : "Square"})
                      </span>
                    </div>
                  </div>

                  <div className="form-group" style={{ 
                    flexDirection: "row", 
                    justifyContent: "space-between", 
                    alignItems: "center", 
                    backgroundColor: "rgba(255,255,255,0.02)", 
                    padding: "0.5rem 0.75rem", 
                    borderRadius: "6px", 
                    border: "1px solid rgba(255,255,255,0.05)" 
                  }}>
                    <div style={{ display: "flex", flexDirection: "column" }}>
                      <span className="form-label" style={{ margin: 0 }}>Puzzle Status</span>
                      <span style={{ 
                        fontSize: "0.9rem", 
                        fontWeight: "bold", 
                        color: group.solved ? "var(--accent-emerald)" : "var(--text-secondary)" 
                      }}>
                        {group.solved ? "🏆 Completed / Solved" : "⏳ Unsolved / Pending"}
                      </span>
                    </div>
                    {group.solved && (
                      <button
                        type="button"
                        onClick={() => {
                          handleChange(key, "solved", false);
                          showToast(`Revoked solve status for ${group.name || key}. Save to persist.`);
                        }}
                        className="btn-secondary"
                        style={{ 
                          padding: "0.4rem 0.8rem", 
                          fontSize: "0.8rem", 
                          borderColor: "rgba(244, 63, 94, 0.4)", 
                          color: "var(--accent-rose)", 
                          backgroundColor: "rgba(244, 63, 94, 0.05)" 
                        }}
                      >
                        Revoke Solve
                      </button>
                    )}
                  </div>

                  <div className="form-group">
                    <label className="form-label">Unlocked Clue String (Glows on win)</label>
                    <input
                      type="text"
                      className="form-input"
                      value={group.clue}
                      onChange={(e) => handleChange(key, "clue", e.target.value)}
                      placeholder="Enter the clue text to display upon winning..."
                      required
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="admin-footer">
            <Link href="/" className="btn-secondary">
              Cancel
            </Link>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary"
              style={{ minWidth: "180px" }}
            >
              {saving ? "Saving Changes..." : "Save Configuration"}
            </button>
          </div>
        </form>
      </main>

      <footer className="footer">
        <p>© 2026 Puzzel Hub. Built with Next.js App Router.</p>
      </footer>
    </>
  );
}
