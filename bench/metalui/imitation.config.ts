import config from './ownership.config.ts';

export default {
  ...config,
  imitation: {
    // Textarea's WELL uses recipe-well-field; Field.Root delegates that material
    // to Well. material-well is the legacy well paint (gradient + inset shadow),
    // not an exclusive identity: restrict it to native text controls here.
    Textarea: { elements: ['textarea'], fingerprint: ['material-well', 'var(--mu-r-well-'] },
    Field: { elements: ['input'], fingerprint: ['material-well', 'var(--mu-r-well-'] },
  },
};
