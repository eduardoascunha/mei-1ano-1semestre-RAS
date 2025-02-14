<template>
  <div class="flex-1 flex flex-col p-4 sm:p-6 md:p-8 z-10">
    <Notification :message="notification" />

    <h1 class="text-3xl font-bold text-azure-radiance-500 mb-8">
      Your Projects
    </h1>
    <div class="w-full flex justify-center mb-6 sm:mb-8 mt-16 md:mt-0">
      <div class="relative w-full max-w-2xl px-4">
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search for project titles..."
          class="w-full bg-white text-gray-800 font-medium py-2 sm:py-3 px-4 pr-12 rounded-full border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm sm:text-base z-10"
        />
        <div
          class="absolute inset-y-0 right-0 flex items-center pr-6 pointer-events-none"
        >
          <svg
            class="w-4 h-4 sm:w-5 sm:h-5 text-gray-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              stroke-linecap="round"
              stroke-linejoin="round"
              stroke-width="2"
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            ></path>
          </svg>
        </div>
      </div>
    </div>
    
    <DropZone @files-dropped="handleFiles" class="border-2 border-dashed border-gray-400 rounded-lg p-6 flex flex-col items-center justify-center mb-8" />

    <div v-if="showTitleModal" class="fixed inset-0 flex justify-center items-center bg-black bg-opacity-50 z-50">
      <div class="bg-white p-6 sm:p-8 md:p-10 rounded-lg w-full max-w-lg md:max-w-1/3">
        <h2 class="text-xl sm:text-2xl font-semibold mb-4">Enter Project Title</h2>
        <input
          v-model="titleInput"
          type="text"
          placeholder="Project Title"
          class="w-full bg-gray-100 text-gray-800 font-medium py-2 sm:py-3 px-4 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        <div class="flex justify-end mt-4">
          <button
            class="bg-blue-500 text-white py-2 px-4 rounded-lg mr-2"
            @click="saveProject"
          >
            Save
          </button>
          <button
            class="bg-gray-300 text-gray-800 py-2 px-4 rounded-lg"
            @click="closeTitleModal"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>

    <div v-if="filteredProjects.length === 0" class="text-center text-gray-500 mt-8">
      No projects found. Start by creating a new project!
    </div>
    <div v-else class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6 px-4">
      <ProjectCard
        v-for="project in filteredProjects"
        :key="project._id"
        :project="project"
        :dropdown-options="[]"
        mode="default"
        @open-new-tab="openInNewTab"
        @rename="renameProject"
        @move-to-trash="moveToTrash"
        @edit="editProject"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useRouter } from 'vue-router';
import ProjectCard from "@/components/ProjectCard.vue";
import { useProjectStore } from "@/stores/projectsStore";
import Notification from '@/components/CustomNotification.vue';
import DropZone from "@/components/DropZone.vue";
const projectStore = useProjectStore();
const router = useRouter();

const searchQuery = ref("");
const notification = ref<string | null>(null);
const showTitleModal = ref(false);
const titleInput = ref("");
const newImageFiles = ref<File[]>([]);

const filteredProjects = computed(() => {
  return projectStore.projects
    .filter((project) =>
      project.name.toLowerCase().includes(searchQuery.value.toLowerCase())
    )
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
});

const editProject = (id: number) => {
  router.push(`/project/${id}`);
};

const openInNewTab = (id: number) => {
  const fullUrl = window.location.origin + "/project/" + id;
  window.open(fullUrl, "_blank");
};

const renameProject = async (id: string, newName: string) => {
  try {
    await projectStore.updateProject(id, { name: newName });
    showNotification('Project renamed successfully');
  } catch {
    showNotification('Failed to rename project');
  }
};

const moveToTrash = async (id: string) => {
  try {
    await projectStore.deleteProject(id);
    showNotification('Project moved to trash');
  } catch {
    showNotification('Failed to move project to trash');
  }
};

const handleFiles = (files: File[]) => {
  newImageFiles.value = files;
  titleInput.value = '';
  showTitleModal.value = true;
};

const showNotification = (message: string) => {
  notification.value = message;
  setTimeout(() => {
    notification.value = null;
  }, 3000);
};

const saveProject = async () => {
  if (titleInput.value.trim() === "") {
    showNotification("Please enter a title for the project.");
    return;
  }

  try {
    const newProject = await projectStore.createProject({ name: titleInput.value });

    for (const file of newImageFiles.value) {
      await projectStore.addProjectImage(newProject._id, file);
    }

    showNotification("Project created successfully!");
    closeTitleModal();
  } catch {
    showNotification("Failed to create project.");
  }
};

const closeTitleModal = () => {
  showTitleModal.value = false;
};
</script>