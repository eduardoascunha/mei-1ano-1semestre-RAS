<template>
  <div class="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50 p-4">
    <div class="bg-white rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center mb-6">
        <h2 class="text-2xl font-bold">{{ formatOptionName(toolName) }}</h2>
        <button 
          @click="cancel" 
          class="text-gray-400 hover:text-gray-500 focus:outline-none"
        >
          <i class="bi bi-x text-2xl"></i>
        </button>
      </div>
      
      <div class="space-y-6">
        <div v-for="(option, key) in toolOptions" :key="key" class="space-y-2">
          <label :for="key" class="block text-sm font-medium text-gray-700">
            {{ formatOptionName(key) }}
          </label>
          
          <div v-if="toolName === 'addBorder' && key === 'color'" class="space-y-4">
            <ColorPicker 
              v-model:pureColor="toolValues[key]"
              :default-value="option.default || '#000000'"
              theme="light"
              format="hex"
            />
            <input
              :id="key"
              v-model="toolValues[key]"
              type="text"
              :pattern="option.pattern"
              class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          
          <input
            v-else-if="option.type === 'number'"
            :id="key"
            v-model.number="toolValues[key]"
            type="number"
            :min="option.minimum"
            :max="option.maximum"
            :step="1"
            class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          
          <input
            v-else-if="option.type === 'string' && option.pattern"
            :id="key"
            v-model="toolValues[key]"
            type="text"
            :pattern="option.pattern"
            class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
          
          <select
            v-else-if="option.type === 'string' && option.enum"
            :id="key"
            v-model="toolValues[key]"
            class="w-full px-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option v-for="value in option.enum" :key="value" :value="value">
              {{ value }}
            </option>
          </select>
          
          <div 
            v-else-if="option.type === 'boolean'"
            class="flex items-center"
          >
            <input
              :id="key"
              v-model="toolValues[key]"
              type="checkbox"
              class="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label :for="key" class="ml-2 text-sm text-gray-600">
              Enable
            </label>
          </div>
        </div>
      </div>
      
      <div class="flex justify-end space-x-3 mt-8">
        <button 
          @click="cancel" 
          class="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-400 transition-colors duration-200"
        >
          Cancel
        </button>
        <button 
          @click="apply" 
          class="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-colors duration-200"
        >
          Apply
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import type { ToolOption } from '@/types/project';
import { ColorPicker } from 'vue3-colorpicker';
import 'vue3-colorpicker/style.css';

interface Props {
  toolName: string;
  toolOptions: Record<string, ToolOption>;
}

const props = defineProps<Props>();
const emit = defineEmits(['apply', 'cancel']);

const toolValues = ref<Record<string, unknown>>({});

onMounted(() => {
  for (const [key, option] of Object.entries(props.toolOptions)) {
    toolValues.value[key] = option.default ?? getDefaultValue(option.type);
  }
});

function getDefaultValue(type: string): number | string | boolean {
  switch (type) {
    case 'number': return 0;
    case 'string': return '';
    case 'boolean': return false;
    default: return '';
  }
}

const formatOptionName = (name: string): string => {
  const acronyms = ['OCR', 'PDF', 'RGB', 'URL', 'API'];
  let formatted = name.replace(/-/g, ' ');
  formatted = formatted.replace(/([A-Z])/g, ' $1');
  const words = formatted.trim().split(/\s+/);
  
  const formattedWords = words.map(word => {
    if (acronyms.includes(word.toUpperCase())) {
      return word.toUpperCase();
    }
    return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
  });
  
  return formattedWords.join(' ');
};

const apply = () => {
  emit('apply', { filterName: props.toolName, args: toolValues.value });
};

const cancel = () => {
  emit('cancel');
};
</script>

<style>
.vue3-colorpicker {
  --colorpicker-bg-color: white;
  --colorpicker-border-color: #e5e7eb;
  --colorpicker-border-radius: 0.375rem;
  --colorpicker-box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  width: 100%;
}
</style>