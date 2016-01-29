interface TextEditorSettingsResourcePub {
  tabSize: number;
  softTab: boolean;
  theme: string;
}

export default class TextEditorSettingsResource extends SupCore.Data.Base.Resource {

  static schema: SupCore.Data.Schema = {
    tabSize: { type: "number", min: 1, mutable: true },
    softTab: { type: "boolean", mutable: true },
    theme: { type: "string", mutable: true },
  }

  pub: TextEditorSettingsResourcePub;

  constructor(id: string, pub: any, server: ProjectServer) {
    super(id, pub, TextEditorSettingsResource.schema, server);
  }

  init(callback: Function) {
    this.pub = {
      tabSize: 2,
      softTab: true,
      theme: "default"
    };

    super.init(callback);
  }
}
