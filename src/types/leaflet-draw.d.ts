import 'leaflet';

declare module 'leaflet' {
  namespace Control {
    class Draw extends Control {
      constructor(options?: DrawConstructorOptions);
    }

    interface DrawConstructorOptions {
      position?: string;
      draw?: DrawOptions;
      edit?: EditOptions;
    }

    interface DrawOptions {
      polyline?: any;
      polygon?: any;
      rectangle?: any;
      circle?: any;
      marker?: any;
      circlemarker?: any;
    }

    interface EditOptions {
      featureGroup?: FeatureGroup;
      remove?: boolean;
      edit?: any;
    }
  }

  namespace Draw {
    namespace Event {
      const CREATED: string;
      const EDITED: string;
      const DELETED: string;
    }
  }
}
