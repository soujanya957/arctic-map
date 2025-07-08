# run_0.sh
# For default tmux config (pane and window indices start at 0)
# Creates a new session "arctic-map" with 3 panes:
# Left: main.py | Top-right: zip_downloads.py | Bottom-right: frontend

SESSION="arctic-map"

# Kill any existing session
tmux kill-session -t $SESSION 2>/dev/null

# Start new session with a shell
tmux new-session -d -s $SESSION -n dev

# Wait for the window to be ready
while ! tmux list-windows -t $SESSION 2>/dev/null | grep -q dev; do
  sleep 0.1
done

# Pane 0 (left): main.py
tmux send-keys -t $SESSION:0.0 "cd backend && source venv/bin/activate 2>/dev/null || true && uvicorn main:app --reload --port 8000" C-m

# Split right (vertical) for zip_downloads.py (pane 1)
tmux split-window -h -t $SESSION:0.0
tmux send-keys -t $SESSION:0.1 "cd backend && source venv/bin/activate 2>/dev/null || true && uvicorn zip_downloads:app --reload --port 8001" C-m

# Split bottom-right (horizontal) for frontend (pane 2)
tmux split-window -v -t $SESSION:0.1
tmux send-keys -t $SESSION:0.2 "cd frontend && npm run dev" C-m

# Select left pane on attach
tmux select-pane -t $SESSION:0.0

# Attach to the session (from inside or outside tmux)
if [ -n "$TMUX" ]; then
  tmux switch-client -t $SESSION
else
  tmux attach-session -t $SESSION
fi

