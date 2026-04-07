import { useEffect } from "preact/hooks";
import { artifacts } from "../../state/store";
import { listArtifacts, deleteArtifact } from "../../api/commands";
import { ArtifactItem } from "./ArtifactItem";

export function ArtifactsPanel() {
  useEffect(() => {
    listArtifacts()
      .then((items) => {
        artifacts.value = items;
      })
      .catch(() => {});
  }, []);

  async function handleDelete(name: string) {
    await deleteArtifact(name);
    artifacts.value = artifacts.value.filter((a) => a.name !== name);
  }

  if (artifacts.value.length === 0) {
    return (
      <div class="empty-state" style={{ paddingTop: "60px" }}>
        <div class="empty-state-text">
          No artifacts yet. The agent can save files here for reuse.
        </div>
      </div>
    );
  }

  return (
    <div class="artifacts-panel">
      {artifacts.value.map((artifact) => (
        <ArtifactItem
          key={artifact.name}
          artifact={artifact}
          onDelete={() => handleDelete(artifact.name)}
        />
      ))}
    </div>
  );
}
