# run.sh
# Always creates a new tmux session "arctic-map" with 3 panes,
# even if run from inside another tmux session.
# Pane 1 (left): main.py
# Pane 2 (top-right): zip_downloads.py
# Pane 3 (bottom-right): frontend (npm run dev)

SESSION="arctic-map"

# Kill any existing session with the same name
tmux kill-session -t $SESSION 2>/dev/null

# Start new session with a shell
tmux new-session -d -s $SESSION -n dev

# Wait for the window to be ready (pane/window indices start at 1)
while ! tmux list-windows -t $SESSION 2>/dev/null | grep -q dev; do
  sleep 0.1
done

# Pane 1 (left): main.py
tmux send-keys -t $SESSION:1.1 "cd backend && source venv/bin/activate 2>/dev/null || true && uvicorn main:app --reload --port 8000" C-m

# Split right (vertical) for zip_downloads.py (pane 2)
tmux split-window -h -t $SESSION:1.1
tmux send-keys -t $SESSION:1.2 "cd backend && source venv/bin/activate 2>/dev/null || true && uvicorn zip_downloads:app --reload --port 8001" C-m

# Split bottom-right (horizontal) for frontend (pane 3)
tmux split-window -v -t $SESSION:1.2
tmux send-keys -t $SESSION:1.3 "cd frontend && npm run dev" C-m

# Select left pane on attach
tmux select-pane -t $SESSION:1.1

# Attach to the session (from inside or outside tmux)
if [ -n "$TMUX" ]; then
  tmux switch-client -t $SESSION
else
  tmux attach-session -t $SESSION
fi

