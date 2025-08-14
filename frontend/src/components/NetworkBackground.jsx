import React, { useRef, useMemo, Suspense, useState, useCallback } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Points, PointMaterial } from '@react-three/drei'
import * as THREE from 'three'

function InteractiveNetworkPoints({ mousePos }) {
  const mainRef = useRef()
  const pointsRef = useRef()
  const { viewport } = useThree()
  
  // Generate layered network with depth
  const networkData = useMemo(() => {
    const layers = 3
    const pointsPerLayer = 100
    const totalPoints = layers * pointsPerLayer
    
    const positions = new Float32Array(totalPoints * 3)
    const originalPositions = new Float32Array(totalPoints * 3)
    const sizes = new Float32Array(totalPoints)
    const colors = new Float32Array(totalPoints * 3)
    const connections = []
    
    let pointIndex = 0
    
    for (let layer = 0; layer < layers; layer++) {
      const layerDepth = -layer * 8 - 5
      const layerRadius = 25 + layer * 10
      
      for (let i = 0; i < pointsPerLayer; i++) {
        const angle = (i / pointsPerLayer) * Math.PI * 2
        const radiusVariation = 1 + Math.random() * 0.8
        const radius = layerRadius * radiusVariation
        
        const x = Math.cos(angle) * radius + (Math.random() - 0.5) * 15
        const y = Math.sin(angle) * radius + (Math.random() - 0.5) * 15
        const z = layerDepth + (Math.random() - 0.5) * 6
        
        positions[pointIndex * 3] = x
        positions[pointIndex * 3 + 1] = y
        positions[pointIndex * 3 + 2] = z
        
        originalPositions[pointIndex * 3] = x
        originalPositions[pointIndex * 3 + 1] = y
        originalPositions[pointIndex * 3 + 2] = z
        
        // Size based on depth and randomness
        const depthFactor = 1 - (layer / layers) * 0.5
        sizes[pointIndex] = (0.05 + Math.random() * 0.08) * depthFactor
        
        // Color based on depth
        const colorIntensity = depthFactor * (0.8 + Math.random() * 0.2)
        colors[pointIndex * 3] = 0.4 + colorIntensity * 0.6     // R
        colors[pointIndex * 3 + 1] = 0.5 + colorIntensity * 0.5 // G
        colors[pointIndex * 3 + 2] = 0.9 + colorIntensity * 0.1 // B
        
        pointIndex++
      }
    }
    
    // Create connections with depth consideration
    for (let i = 0; i < totalPoints; i++) {
      for (let j = i + 1; j < totalPoints; j++) {
        const dx = positions[i * 3] - positions[j * 3]
        const dy = positions[i * 3 + 1] - positions[j * 3 + 1]
        const dz = positions[i * 3 + 2] - positions[j * 3 + 2]
        const distance = Math.sqrt(dx * dx + dy * dy + dz * dz)
        
        const maxDistance = Math.abs(dz) < 3 ? 8 : 5
        
        if (distance < maxDistance && Math.random() > 0.85) {
          const opacity = Math.max(0.05, 0.2 - distance * 0.025)
          connections.push({
            start: [positions[i * 3], positions[i * 3 + 1], positions[i * 3 + 2]],
            end: [positions[j * 3], positions[j * 3 + 1], positions[j * 3 + 2]],
            opacity,
            distance
          })
        }
      }
    }
    
    return { positions, originalPositions, sizes, colors, connections, totalPoints }
  }, [])

  useFrame((state) => {
    if (mainRef.current) {
      // Subtle base rotation
      mainRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 0.08) * 0.05
      mainRef.current.rotation.y = state.clock.elapsedTime * 0.03
    }
    
    if (pointsRef.current && mousePos) {
      const positions = pointsRef.current.geometry.attributes.position.array
      const sizes = pointsRef.current.geometry.attributes.size.array
      const colors = pointsRef.current.geometry.attributes.color.array
      
      // Convert mouse position to world coordinates
      const mouseX = (mousePos.x / window.innerWidth) * 2 - 1
      const mouseY = -(mousePos.y / window.innerHeight) * 2 + 1
      const mouseWorldX = mouseX * viewport.width / 2
      const mouseWorldY = mouseY * viewport.height / 2
      
      for (let i = 0; i < networkData.totalPoints; i++) {
        const originalX = networkData.originalPositions[i * 3]
        const originalY = networkData.originalPositions[i * 3 + 1]
        const originalZ = networkData.originalPositions[i * 3 + 2]
        
        // Calculate distance from mouse to point (in 2D screen space)
        const dx = originalX - mouseWorldX
        const dy = originalY - mouseWorldY
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        // Ripple effect parameters
        const rippleRadius = 8
        const rippleStrength = 3
        const timeOffset = state.clock.elapsedTime * 4
        
        if (distance < rippleRadius) {
          // Create ripple wave
          const normalizedDistance = distance / rippleRadius
          const wave = Math.sin(normalizedDistance * Math.PI * 3 - timeOffset) * 
                      (1 - normalizedDistance) * rippleStrength
          
          // Apply wave displacement
          const direction = distance > 0 ? 1 : 0
          const waveX = direction * (dx / distance) * wave * 0.5
          const waveY = direction * (dy / distance) * wave * 0.5
          const waveZ = wave * 0.3
          
          positions[i * 3] = originalX + waveX
          positions[i * 3 + 1] = originalY + waveY
          positions[i * 3 + 2] = originalZ + waveZ
          
          // Enhance size and brightness
          const enhancement = (1 - normalizedDistance) * 2
          sizes[i] = networkData.sizes[i] * (1 + enhancement)
          
          colors[i * 3] = Math.min(1, networkData.colors[i * 3] + enhancement * 0.3)
          colors[i * 3 + 1] = Math.min(1, networkData.colors[i * 3 + 1] + enhancement * 0.2)
          colors[i * 3 + 2] = Math.min(1, networkData.colors[i * 3 + 2] + enhancement * 0.1)
        } else {
          // Return to original position
          positions[i * 3] = originalX
          positions[i * 3 + 1] = originalY
          positions[i * 3 + 2] = originalZ
          sizes[i] = networkData.sizes[i]
          colors[i * 3] = networkData.colors[i * 3]
          colors[i * 3 + 1] = networkData.colors[i * 3 + 1]
          colors[i * 3 + 2] = networkData.colors[i * 3 + 2]
        }
      }
      
      pointsRef.current.geometry.attributes.position.needsUpdate = true
      pointsRef.current.geometry.attributes.size.needsUpdate = true
      pointsRef.current.geometry.attributes.color.needsUpdate = true
    }
  })

  return (
    <group ref={mainRef}>
      <Points ref={pointsRef} positions={networkData.positions}>
        <PointMaterial
          transparent
          vertexColors
          size={0.08}
          sizeAttenuation={true}
          depthWrite={false}
          opacity={0.8}
        />
      </Points>
      
      {/* Enhanced connection lines with varying opacity */}
      {networkData.connections.map((connection, index) => (
        <line key={index}>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              count={2}
              array={new Float32Array([...connection.start, ...connection.end])}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial
            color={connection.distance < 6 ? "#f6d365" : "#667eea"}
            transparent
            opacity={connection.opacity}
          />
        </line>
      ))}
    </group>
  )
}

function FloatingParticles({ mousePos }) {
  const particlesRef = useRef()
  const { viewport } = useThree()
  
  const particleData = useMemo(() => {
    const count = 80
    const positions = new Float32Array(count * 3)
    const velocities = new Float32Array(count * 3)
    const sizes = new Float32Array(count)
    
    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20
      
      velocities[i * 3] = (Math.random() - 0.5) * 0.015
      velocities[i * 3 + 1] = (Math.random() - 0.5) * 0.015
      velocities[i * 3 + 2] = (Math.random() - 0.5) * 0.008
      
      sizes[i] = 0.008 + Math.random() * 0.02
    }
    
    return { positions, velocities, sizes, count }
  }, [])

  useFrame((state) => {
    if (particlesRef.current) {
      const positions = particlesRef.current.geometry.attributes.position.array
      const sizes = particlesRef.current.geometry.attributes.size.array
      
      for (let i = 0; i < particleData.count; i++) {
        // Basic movement
        positions[i * 3] += particleData.velocities[i * 3]
        positions[i * 3 + 1] += particleData.velocities[i * 3 + 1]
        positions[i * 3 + 2] += particleData.velocities[i * 3 + 2]
        
        // Boundary wrapping
        if (Math.abs(positions[i * 3]) > 20) positions[i * 3] *= -1
        if (Math.abs(positions[i * 3 + 1]) > 20) positions[i * 3 + 1] *= -1
        if (Math.abs(positions[i * 3 + 2]) > 10) positions[i * 3 + 2] *= -1
        
        // Mouse influence
        if (mousePos) {
          const mouseX = (mousePos.x / window.innerWidth) * 2 - 1
          const mouseY = -(mousePos.y / window.innerHeight) * 2 + 1
          const mouseWorldX = mouseX * viewport.width / 2
          const mouseWorldY = mouseY * viewport.height / 2
          
          const dx = positions[i * 3] - mouseWorldX
          const dy = positions[i * 3 + 1] - mouseWorldY
          const distance = Math.sqrt(dx * dx + dy * dy)
          
          if (distance < 12) {
            const force = (12 - distance) / 12
            sizes[i] = particleData.sizes[i] * (1 + force * 3)
          } else {
            sizes[i] = particleData.sizes[i]
          }
        }
      }
      
      particlesRef.current.geometry.attributes.position.needsUpdate = true
      particlesRef.current.geometry.attributes.size.needsUpdate = true
    }
  })

  return (
    <Points ref={particlesRef} positions={particleData.positions}>
      <PointMaterial
        transparent
        color="#f6d365"
        size={0.015}
        sizeAttenuation={true}
        depthWrite={false}
        opacity={0.6}
      />
    </Points>
  )
}

function NetworkBackground() {
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 })
  
  const handleMouseMove = useCallback((event) => {
    setMousePos({ x: event.clientX, y: event.clientY })
  }, [])
  
  React.useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [handleMouseMove])
  
  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: 1,
        background: `
          radial-gradient(ellipse at 20% 50%, rgba(102, 126, 234, 0.08) 0%, transparent 50%),
          radial-gradient(ellipse at 80% 20%, rgba(246, 211, 101, 0.06) 0%, transparent 50%),
          radial-gradient(ellipse at 40% 80%, rgba(118, 75, 162, 0.06) 0%, transparent 50%),
          linear-gradient(135deg, #0a0a0a 0%, #1a1a2e 50%, #0a0a0a 100%)
        `
      }}
    >
      <Canvas
        camera={{ position: [0, 0, 12], fov: 50 }}
        style={{ background: 'transparent' }}
        dpr={Math.min(window.devicePixelRatio, 2)}
        performance={{ min: 0.5 }}
      >
        <Suspense fallback={null}>
          <ambientLight intensity={0.4} />
          <pointLight position={[10, 10, 10]} intensity={0.6} color="#667eea" />
          <pointLight position={[-10, -10, -5]} intensity={0.4} color="#f6d365" />
          
          <InteractiveNetworkPoints mousePos={mousePos} />
          <FloatingParticles mousePos={mousePos} />
        </Suspense>
      </Canvas>
    </div>
  )
}

export default NetworkBackground
