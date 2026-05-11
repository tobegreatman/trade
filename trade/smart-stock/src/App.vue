<template>
  <NavBar />
  <main class="page-container">
    <router-view />
  </main>
</template>

<script setup>
import NavBar from './components/NavBar.vue'
</script>
