<template>
  <div>
    <h2 class="text-2xl font-semibold text-gray-900 mb-6">Billing</h2>
    
    <div v-if="isLoading" class="flex justify-center items-center h-64">
      <div class="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
    </div>
    
    <div v-else>
      <div class="mb-8">
        <h3 class="text-lg font-medium text-gray-900 mb-2">Current Plan</h3>
        <div class="bg-gray-100 p-4 rounded-lg">
          <p class="text-lg font-semibold">{{ subscriptionsStore.isPremium ? 'Premium' : 'Free' }}</p>
          <p v-if="subscriptionsStore.isPremium" class="text-gray-600">${{ subscriptionsStore.currentPlan === 'month' ? monthlyPrice : yearlyPrice }} / {{ subscriptionsStore.currentPlan }}</p>
          <button @click="goToPlans" class="mt-2 text-blue-600 hover:text-blue-800">Check our available plans</button>
          <button v-if="subscriptionsStore.isPremium" @click="cancelSubscription" class="mt-2 ml-4 text-red-600 hover:text-red-800">Cancel Subscription</button>
        </div>
      </div>

      <div class="mb-8">
        <h3 class="text-lg font-medium text-gray-900 mb-2">Payment Method</h3>
        <div class="flex items-center justify-between">
          <div class="flex items-center">
            <i class="bi bi-credit-card text-2xl mr-2"></i>
            <span v-if="subscriptionsStore.billingInfo.last4">
              {{ subscriptionsStore.billingInfo.brand }} •••• •••• •••• {{ subscriptionsStore.billingInfo.last4 }}
            </span>
            <span v-else class="text-gray-600">No payment method set</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useSubscriptionStore } from '@/stores/subscriptionStore';
import { getPlans } from '@/api';

const router = useRouter();
const subscriptionsStore = useSubscriptionStore();
const monthlyPrice = ref(0)
const yearlyPrice = ref(0)
const isLoading = ref(true);


onMounted(async () => {
  isLoading.value = true;
  try {
    await subscriptionsStore.fetchBillingInfo();
    
    const plans = await getPlans()
        if (plans["month"]) {
            monthlyPrice.value = plans["month"].amount / 100
        }
        if (plans["year"]) {
            yearlyPrice.value = plans["year"].amount / 100
        }
  } catch (error) {
    console.error('Failed to fetch billing info or plans:', error);
  } finally {
    isLoading.value = false;
  }
});

const goToPlans = () => {
  router.push('/plans');
};

const cancelSubscription = async () => {
  try {
    await subscriptionsStore.cancelPremiumSubscription();
    router.go(0);
  } catch (error) {
    console.error('Failed to cancel subscription:', error);
  }
};
</script>