"use client";

import React, { useState, useEffect } from "react";
import JigsawPuzzle from "@/components/JigsawPuzzle";
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

export default function Home() {
  const [config, setConfig] = useState<ConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedGroupKey, setSelectedGroupKey] = useState<string | null>(null);

  // Fetch puzzle configuration from API on mount
  useEffect(() => {
    async function loadConfig() {
      try {
        const res = await fetch("/api/config");
        if (res.ok) {
          const data = await res.json();
          setConfig(data);
        }
      } catch (err) {
        console.error("Failed to load puzzle config", err);
      } finally {
        setLoading(false);
      }
    }
    loadConfig();
  }, []);

  const handleGroupComplete = async (groupKey: string) => {
    // 1. Sync solve state to server
    try {
      await fetch("/api/solve", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ group: groupKey }),
      });
    } catch (err) {
      console.error("Failed to save solved status to server", err);
    }

    // 2. Update local state immediately for visual responsiveness
    if (config) {
      const key = groupKey as keyof ConfigData;
      setConfig({
        ...config,
        [key]: {
          ...config[key],
          solved: true,
        },
      });
    }
  };

  if (loading) {
    return (
      <div className="main-dashboard" style={{ justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div className="title-group">
          <h2 className="puzzle-title" style={{ fontSize: "2rem", animation: "pulse-glow 1.5s infinite alternate" }}>Loading Jigsaw Hub...</h2>
          <p className="puzzle-subtitle">Gathering puzzle configurations and canvases...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="main-dashboard" style={{ justifyContent: "center", alignItems: "center", minHeight: "80vh" }}>
        <div className="title-group">
          <h2 className="puzzle-title">Connection Error</h2>
          <p className="puzzle-subtitle">We couldn&apos;t retrieve the puzzle configurations. Please verify server status.</p>
        </div>
      </div>
    );
  }

  // If a group is selected, show the jigsaw puzzle interface
  if (selectedGroupKey) {
    const groupKey = selectedGroupKey as keyof ConfigData;
    const activeGroup = config[groupKey];
    return (
      <>
        <header className="navbar">
          <Link href="/" onClick={() => setSelectedGroupKey(null)} className="nav-logo">
            Puzzel Hub
          </Link>
          <div className="nav-links">
            {/* Admin panel link removed for production */}
          </div>
        </header>
        <main className="main-dashboard">
          <JigsawPuzzle
            groupName={activeGroup.name}
            imageSrc={activeGroup.image}
            clueText={activeGroup.clue}
            rows={activeGroup.rows}
            cols={activeGroup.cols}
            onBack={() => setSelectedGroupKey(null)}
            onComplete={() => handleGroupComplete(selectedGroupKey)}
          />
        </main>
        <footer className="footer">
          <p>© 2026 Puzzel Hub. Built with Next.js App Router.</p>
        </footer>
      </>
    );
  }

  // Otherwise, show the selection dashboard with 4 cards
  const groupsList = [
    { key: "group1", data: config.group1 },
    { key: "group2", data: config.group2 },
    { key: "group3", data: config.group3 },
    { key: "group4", data: config.group4 },
  ];

  return (
    <>
      <header className="navbar">
        <Link href="/" className="nav-logo">
          Puzzel Hub
        </Link>
        <div className="nav-links" />
      </header>

      <main className="main-dashboard">
        <div className="hero-section">
          <h1 className="hero-title">Select a Group Jigsaw</h1>
          <p className="hero-subtitle">
            Choose from the four mystery coordinates. Drag, position, and snap the pieces to unlock the hidden, glowing clues.
          </p>
        </div>

        <div className="groups-grid">
          {groupsList.map((group) => {
            const isSolved = group.data.solved;
            const groupNumber = group.key.replace("group", "Group ");
            return (
              <div
                key={group.key}
                onClick={() => setSelectedGroupKey(group.key)}
                className="group-card"
              >
                <div className="group-box-preview">
                  <span>{groupNumber}</span>
                </div>
                <div className="group-card-header">
                  <span className="group-name">{groupNumber}</span>
                  <span className={`group-status ${isSolved ? "status-solved" : "status-pending"}`}>
                    {isSolved ? "🏆 Solved" : "Pending"}
                  </span>
                </div>
                <button className="btn-primary" style={{ width: "100%" }}>
                  {isSolved ? "Replay Puzzle" : "Solve Puzzle"}
                </button>
              </div>
            );
          })}
        </div>
      </main>

      <footer className="footer">
        <p>© 2026 Puzzel Hub. Built with Next.js App Router.</p>
      </footer>
    </>
  );
}
