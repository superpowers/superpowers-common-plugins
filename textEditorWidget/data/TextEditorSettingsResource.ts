interface TextEditorSettingsResourcePub {
  tabSize: number;
  softTab: boolean;
  keyMap: string;
}

export default class TextEditorSettingsResource extends SupCore.Data.Base.Resource {

  static schema: SupCore.Data.Schema = {
    tabSize: { type: "number", min: 1, mutable: true },
    softTab: { type: "boolean", mutable: true },
    keyMap: { type: "enum", items: [ "sublime", "emacs", "vim" ], mutable: true }
  };

  pub: TextEditorSettingsResourcePub;

  constructor(id: string, pub: any, server: ProjectServer) {
    super(id, pub, TextEditorSettingsResource.schema, server);
  }

  init(callback: Function) {
    this.pub = {
      tabSize: 2,
      softTab: true,
      keyMap: "sublime"
    };

    super.init(callback);
  }
}
