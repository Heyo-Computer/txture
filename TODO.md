# txture
A desktop agent for organizing and doing. Built in Tauri. 

Requirements:
- [ ] Integrates heyvm sidecar to manage virtual machines
- [ ] Agent runs inside of a VM and communicates via Agent Client Protocol 
- [ ] A coding agent with access to a basic suite of tools including web search, file operations, and shells
- [ ] On disk storage partitioned by days and months that is mounted to VM and the agent has access to 
- [ ] a UI that contains a panel with a list of the preceeding 6 as well as the current day
- [ ] the selected day expands into a an interactive to do list
- [ ] a chat window for interacting with the agent
- [ ] each item in the list can be expanded into a markdown spec; by default only show the rendered markdown since the agent should primarily be editing
- [ ] the agent should be able to save things like files to a global directory on the mounted disk for reuse; display a "artifacts" UI tab for displaying these (default closed)
- [ ] build a theme system for colors and fonts used in the UI
