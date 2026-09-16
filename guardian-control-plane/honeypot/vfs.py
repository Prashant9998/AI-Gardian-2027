"""
Stateful Virtual Filesystem (VFS) & Interactive Linux Shell Emulator
Conformant to Cowrie-style stateful deception.
Provides an in-memory realistic Linux environment that maintains directory state,
file creation, process inspection, and command execution across sessions.
"""

import time
import posixpath
from typing import Dict, Any, List, Optional
from honeypot.canary import canary_engine

DEFAULT_PASSWD = """root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
sysadmin:x:1000:1000:System Administrator,,,:/home/sysadmin:/bin/bash
backup_user:x:1001:1001:Decoy Backup User:/home/backup_user:/bin/sh
postgres:x:105:113:PostgreSQL administrator,,,:/var/lib/postgresql:/bin/bash
"""

DEFAULT_SHADOW = """root:$6$rounds=4096$roundsSalt123$FakeShadowHashForRootDoNotCrack991823:19720:0:99999:7:::
www-data:*:19720:0:99999:7:::
sysadmin:$6$rounds=4096$saltAdmin$FakeShadowHashForSysAdmin12345678:19720:0:99999:7:::
"""

DEFAULT_PROCESSES = """USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.1 168432 11244 ?        Ss   08:00   0:02 /sbin/init
root         412  0.0  0.1  72456  8920 ?        Ss   08:00   0:00 /lib/systemd/systemd-journald
root         819  0.0  0.2 245128 18452 ?        Ssl  08:00   0:01 /usr/sbin/rsyslogd -n
root        1024  0.0  0.3 108420 24104 ?        Ss   08:00   0:00 /usr/sbin/sshd -D
postgres    1180  0.1  0.8 384512 65420 ?        S    08:00   0:05 /usr/lib/postgresql/15/bin/postgres
root        1420  0.0  0.2 142104 19204 ?        Ss   08:01   0:01 nginx: master process /usr/sbin/nginx
www-data    1421  0.2  0.5 145820 41200 ?        S    08:01   0:08 nginx: worker process
www-data    1590  0.4  1.2 298412 98450 ?        S    08:01   0:14 php-fpm: pool www
www-data   18492  0.0  0.0  14520  3210 ?        R    12:00   0:00 ps aux
"""

class VirtualSessionShell:
    """
    Stateful bash shell session for a single attacker.
    Tracks current working directory, created files, and command history.
    """
    def __init__(self, session_id: str, ip: str):
        self.session_id = session_id
        self.ip = ip
        self.cwd = "/var/www/html"
        self.user = "www-data"
        self.history: List[str] = []
        self.download_attempts: List[Dict[str, Any]] = []
        
        # In-memory virtual filesystem: full_path -> content
        self.vfs: Dict[str, str] = {
            "/etc/passwd": DEFAULT_PASSWD,
            "/etc/shadow": DEFAULT_SHADOW,
            "/etc/hostname": "prod-app-server-01.corp",
            "/etc/issue": "Ubuntu 22.04.3 LTS \\n \\l\n",
            "/var/www/html/index.php": "<?php\n// Enterprise Application Gateway\nrequire_once('config.php');\necho 'OK';\n",
            "/var/www/html/config.php": f"<?php\ndefine('DB_HOST', 'localhost');\ndefine('DB_USER', 'guardian_admin');\ndefine('DB_PASS', '{canary_engine.generate_db_uri()}');\ndefine('API_SECRET', '{canary_engine.generate_api_key()}');\n",
            "/var/www/html/.env": f"APP_NAME=EnterpriseSecurity\nAPP_ENV=production\nAPP_KEY={canary_engine.generate_api_key('Laravel App Key')}\nDB_CONNECTION=pgsql\nDB_URL={canary_engine.generate_db_uri('Production Postgres')}\nAWS_ACCESS_KEY_ID={canary_engine.generate_aws_key('S3 Backup')['aws_access_key_id']}\n",
            "/var/www/html/robots.txt": "User-agent: *\nDisallow: /admin/\nDisallow: /backup/\nDisallow: /.git/\n",
            "/home/sysadmin/notes.txt": "Remember to rotate the master AWS credentials before Friday maintenance window.\n",
            "/windows/win.ini": "; for 16-bit app support\n[fonts]\n[extensions]\n[mci extensions]\n[files]\n[Mail]\nMAPI=1\n[SecurityConfig]\nBackupVault=D:\\EnterpriseBackups\\2026_Q3\n",
            "/tmp/.placeholder": ""
        }

    def execute(self, cmd_line: str) -> str:
        """
        Executes a simulated bash command line, maintaining state.
        """
        cmd_line = cmd_line.strip()
        if not cmd_line:
            return ""
        
        self.history.append(cmd_line)
        canary_engine.inspect_and_check(cmd_line, self.ip)

        # Handle chained commands (e.g. "cd /var/www && ls" or "; whoami")
        # For realistic interaction, split by semicolon or &&
        tokens = [t.strip() for t in cmd_line.replace(";", "\n").replace("&&", "\n").split("\n") if t.strip()]
        outputs = []
        for single_cmd in tokens:
            out = self._eval_single_command(single_cmd)
            if out:
                outputs.append(out)
        return "\n".join(outputs)

    def _eval_single_command(self, cmd: str) -> str:
        parts = cmd.split()
        if not parts:
            return ""
        
        base = parts[0].lower()
        args = parts[1:]

        if base == "whoami":
            return self.user
        
        elif base == "id":
            return "uid=33(www-data) gid=33(www-data) groups=33(www-data)"
        
        elif base == "uname":
            if "-a" in args:
                return "Linux prod-app-server-01 5.15.0-89-generic #99-Ubuntu SMP Mon Nov 6 12:00:00 UTC 2026 x86_64 x86_64 x86_64 GNU/Linux"
            return "Linux"
        
        elif base == "pwd":
            return self.cwd
        
        elif base == "hostname":
            return "prod-app-server-01.corp"
        
        elif base == "cd":
            target = args[0] if args else "/var/www"
            if target == "~":
                target = f"/home/{self.user}" if self.user != "root" else "/root"
            elif not target.startswith("/"):
                target = posixpath.normpath(posixpath.join(self.cwd, target))
            else:
                target = posixpath.normpath(target)
            self.cwd = target
            return ""
        
        elif base == "ls" or base == "dir":
            return self._list_dir(args)
        
        elif base == "cat":
            if not args:
                return "cat: missing operand"
            return self._cat_file(args[0])
        
        elif base == "touch":
            if args:
                target_path = self._resolve_path(args[0])
                if target_path not in self.vfs:
                    self.vfs[target_path] = ""
            return ""
        
        elif base == "mkdir":
            if args:
                target_path = self._resolve_path(args[0])
                self.vfs[f"{target_path}/.placeholder"] = ""
            return ""
        
        elif base == "echo":
            # Support "echo 'hello' > file.txt" or "echo 'hello'"
            full_str = " ".join(args)
            if ">" in full_str:
                parts_echo = full_str.split(">")
                text = parts_echo[0].strip().strip("'").strip('"')
                filename = parts_echo[-1].strip()
                self.vfs[self._resolve_path(filename)] = text + "\n"
                return ""
            return full_str.strip("'").strip('"')
        
        elif base == "ps":
            return DEFAULT_PROCESSES
        
        elif base == "netstat":
            return """Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       PID/Program name    
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      1420/nginx: master  
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN      1024/sshd: -D       
tcp        0      0 127.0.0.1:5432          0.0.0.0:*               LISTEN      1180/postgres       
tcp        0      0 127.0.0.1:9000          0.0.0.0:*               LISTEN      1590/php-fpm: pool  
"""
        
        elif base in ["curl", "wget"]:
            # Capture malware download staging URLs!
            url = args[-1] if args else "unknown_url"
            self.download_attempts.append({"tool": base, "url": url, "timestamp": time.time()})
            return f"Connecting to {url}... connected.\nHTTP request sent, awaiting response... 200 OK\nLength: 40960 (40K) [application/octet-stream]\nSaving to: 'malware.sh'\n\nmalware.sh          100%[===================>]  40.00K  --.-KB/s    in 0.02s\n\nSaved [40960/40960]"
        
        elif base == "history":
            return "\n".join([f"{i+1}  {cmd}" for i, cmd in enumerate(self.history)])
        
        else:
            return f"bash: {base}: command not found"

    def _resolve_path(self, path: str) -> str:
        path = path.replace("\\", "/")
        if "win.ini" in path.lower():
            return "/windows/win.ini"
        if not path.startswith("/"):
            return posixpath.normpath(posixpath.join(self.cwd, path))
        return posixpath.normpath(path)

    def _list_dir(self, args: List[str]) -> str:
        target_dir = self.cwd
        for a in args:
            if not a.startswith("-"):
                target_dir = self._resolve_path(a)
                break
        
        # Find all keys starting with target_dir
        prefix = target_dir.rstrip("/") + "/"
        found_entries = set()
        
        for k in self.vfs.keys():
            if k.startswith(prefix):
                rel = k[len(prefix):]
                first_part = rel.split("/")[0]
                if first_part and first_part != ".placeholder":
                    found_entries.add(first_part)
            elif k == target_dir:
                found_entries.add(posixpath.basename(target_dir))
                
        if not found_entries:
            # Check if it's an empty known virtual directory
            if target_dir in ["/bin", "/usr/bin", "/sbin"]:
                return "bash  cat  cd  cp  curl  echo  id  ls  mkdir  netstat  ps  pwd  sh  touch  uname  wget  whoami"
            elif target_dir in ["/var/www", "/var/www/html"]:
                return "config.php  index.php  robots.txt  .env"
            return ""
        
        return "  ".join(sorted(found_entries))

    def _cat_file(self, filename: str) -> str:
        full_path = self._resolve_path(filename)
        if full_path in self.vfs:
            return self.vfs[full_path]
        return f"cat: {filename}: No such file or directory"


class VirtualFilesystemManager:
    """
    Manages stateful virtual sessions across different attacker IPs.
    """
    def __init__(self):
        self._sessions: Dict[str, VirtualSessionShell] = {}

    def get_or_create_session(self, session_id: str, ip: str) -> VirtualSessionShell:
        key = f"{session_id}:{ip}"
        if key not in self._sessions:
            self._sessions[key] = VirtualSessionShell(session_id, ip)
        return self._sessions[key]

# Global VFS Manager
vfs_manager = VirtualFilesystemManager()
