import ipaddress
from typing import List, Optional

class IPFilterEngine:
    """
    Sub-millisecond IP Blocklist/Allowlist engine.
    Matches incoming IP addresses against CIDR ranges.
    """
    def __init__(self):
        # In a real production system, these would be loaded from Redis or DB
        # and cached in memory with a background refresher task.
        self.allowlist_cidrs = []
        self.blocklist_cidrs = []
        
        # Load defaults (e.g., blocking known malicious subnets, allowing internal)
        self.load_rules(
            allowlist=["127.0.0.1/32", "192.168.0.0/16", "10.0.0.0/8"],
            blocklist=[] # Add known malicious CIDRs here
        )

    def load_rules(self, allowlist: List[str], blocklist: List[str]):
        """Parse string CIDRs into ip_network objects for fast matching."""
        self.allowlist_cidrs = [ipaddress.ip_network(cidr, strict=False) for cidr in allowlist]
        self.blocklist_cidrs = [ipaddress.ip_network(cidr, strict=False) for cidr in blocklist]

    def evaluate(self, ip_str: str) -> Optional[str]:
        """
        Evaluate an IP address.
        Returns:
            "ALLOW" if explicitly in allowlist
            "BLOCK" if explicitly in blocklist
            None if no match
        """
        try:
            ip = ipaddress.ip_address(ip_str)
        except ValueError:
            return "BLOCK" # Malformed IP is automatically blocked

        # 1. Check Allowlist (Highest priority)
        for network in self.allowlist_cidrs:
            if ip in network:
                return "ALLOW"
                
        # 2. Check Blocklist
        for network in self.blocklist_cidrs:
            if ip in network:
                return "BLOCK"
                
        return None

# Singleton instance
ip_filter = IPFilterEngine()
