<template>
  <sign-up
    v-bind="$attrs"
    :is-loading="isLoading"
    :error.sync="error"
    @sign-in="onSignIn"
    @submit="onSubmit"
    @social="onSocial"
  />
</template>

<script>
import SignUp from './SignUp.view';
import { authStore } from '@/store';

export default {
  name: 'SignUpInteractor',

  authStore,

  data: () => ({
    isLoading: false,
    error: '',
  }),

  methods: {
    async onSubmit({ email, password }) {
      if (this.isLoading) return;

      try {
        this.isLoading = true;
        this.error = '';

        await this.$options.authStore.loadAuthChallenge({ email });
        this.$emit('sign-up', { email, password, isSignUp: true });
      } catch (e) {
        this.error = this.$i18n.t('components.compositeAuth.authFailed');
      } finally {
        this.isLoading = false;
      }
    },

    async onSocial() {
      this.isLoading = true;

      await this.$options.authStore.waitLogin();
      this.$emit('social');

      this.isLoading = false;
    },

    onSignIn() {
      this.$emit('sign-in');
    },
  },

  components: {
    SignUp,
  },
};
</script>
