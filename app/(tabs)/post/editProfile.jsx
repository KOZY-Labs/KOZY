// Post-flow route for Edit Profile: registered inside the post stack so
// step 4 → Edit Profile → back/save stays in this tab. Jumping to the account
// tab's copy would blur the post tab, and popToTopOnBlur ((tabs)/_layout.jsx)
// destroys the step 1–4 stack the moment that happens.
export { default } from './../account/editProfile';
