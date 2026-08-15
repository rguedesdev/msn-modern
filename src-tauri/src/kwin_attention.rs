#[cfg(target_os = "linux")]
fn set_attention_with_kwin(window_title: &str, attention: bool) -> Result<(), String> {
    use dbus::blocking::Connection;
    use std::{
        fs,
        sync::atomic::{AtomicU64, Ordering},
        time::Duration,
    };

    static SCRIPT_SEQUENCE: AtomicU64 = AtomicU64::new(1);

    let sequence = SCRIPT_SEQUENCE.fetch_add(1, Ordering::Relaxed);
    let script_name = format!("msn-modern-attention-{}-{sequence}", std::process::id());
    let script_path = std::env::temp_dir().join(format!("{script_name}.js"));
    let encoded_title = serde_json::to_string(window_title)
        .map_err(|error| format!("Não foi possível preparar o título da conversa: {error}"))?;
    let script = format!(
        r#"
const targetTitle = {encoded_title};
const windows = workspace.stackingOrder;
for (let index = 0; index < windows.length; index += 1) {{
    if (windows[index].caption.startsWith(targetTitle)) {{
        windows[index].demandsAttention = {attention};
    }}
}}
"#
    );

    fs::write(&script_path, script)
        .map_err(|error| format!("Não foi possível criar o controle de atenção: {error}"))?;

    let execution_result = (|| {
        let connection = Connection::new_session()
            .map_err(|error| format!("Não foi possível acessar a sessão D-Bus: {error}"))?;
        let scripting =
            connection.with_proxy("org.kde.KWin", "/Scripting", Duration::from_millis(800));
        let script_file = script_path.to_string_lossy().into_owned();
        let (script_id,): (i32,) = scripting
            .method_call(
                "org.kde.kwin.Scripting",
                "loadScript",
                (script_file, script_name.clone()),
            )
            .map_err(|error| format!("Não foi possível carregar o controle no KWin: {error}"))?;

        if script_id < 0 {
            return Err("O KWin recusou o controle de atenção".to_owned());
        }

        let script_object = format!("/Scripting/Script{script_id}");
        let loaded_script =
            connection.with_proxy("org.kde.KWin", script_object, Duration::from_millis(800));
        let _: () = loaded_script
            .method_call("org.kde.kwin.Script", "run", ())
            .map_err(|error| format!("Não foi possível executar o controle no KWin: {error}"))?;
        let _: () = loaded_script
            .method_call("org.kde.kwin.Script", "stop", ())
            .map_err(|error| format!("Não foi possível encerrar o controle no KWin: {error}"))?;
        let _: (bool,) = scripting
            .method_call("org.kde.kwin.Scripting", "unloadScript", (script_name,))
            .map_err(|error| format!("Não foi possível descarregar o controle do KWin: {error}"))?;

        Ok(())
    })();

    let _ = fs::remove_file(script_path);
    execution_result
}

#[tauri::command]
pub fn set_kwin_window_attention(window_title: String, attention: bool) -> Result<(), String> {
    #[cfg(target_os = "linux")]
    {
        return set_attention_with_kwin(&window_title, attention);
    }

    #[cfg(not(target_os = "linux"))]
    {
        let _ = (window_title, attention);
        Ok(())
    }
}
